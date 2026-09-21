# Шпаргалка по LangGraph 1.2

Проверено на `langgraph` 1.2.11 и `langchain` 1.4, Python 3.12, сентябрь 2026.

## Установка

```bash
uv add langgraph langchain langchain-openai
uv add langgraph-checkpoint-postgres        # чекпойнтер и Store на Postgres
uv add langchain-mcp-adapters               # внешние инструменты по MCP
uv add --dev "langgraph-cli[inmem]"         # локальный сервер и Studio
```

## Каркас графа

```python
from typing import Annotated, Literal
from typing_extensions import TypedDict
from langgraph.graph import START, END, StateGraph, MessagesState
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]
    answer: str

builder = StateGraph(State, context_schema=Ctx, input_schema=In, output_schema=Out)
builder.add_node("name", fn, retry_policy=..., cache_policy=..., timeout=..., error_handler=..., defer=..., input_schema=..., destinations=...)
builder.add_edge(START, "name")
builder.add_conditional_edges("name", router, {"ключ": "узел"})
builder.set_node_defaults(retry_policy=..., error_handler=...)
graph = builder.compile(checkpointer=..., store=..., cache=..., interrupt_before=[...])
```

Запуск: `graph.invoke(вход, config, context=..., durability=..., control=...)`, поток — `stream` / `astream`.

## Значения по умолчанию, о которых спрашивают

| Что | Значение | Где менять |
|---|---|---|
| Лимит шагов | **10007** (переменная `LANGGRAPH_DEFAULT_RECURSION_LIMIT`) | `config={"recursion_limit": N}` |
| Режим записи снимков | `"async"` | `durability="sync" \| "async" \| "exit"` |
| Обработка ошибок инструмента | исключение пробрасывается | `ToolNode(..., handle_tool_errors=...)` |
| Узел с несколькими входящими ветками | выполняется на каждую | `add_node(..., defer=True)` |
| События подграфов в потоке | не видны | `stream(..., subgraphs=True)` |
| Таймаут узла | нет; только для `async def` | `add_node(..., timeout=сек)` |

## Состояние и редьюсеры

| Объявление | Поведение |
|---|---|
| `x: str` | замена; при параллельной записи — `InvalidUpdateError` |
| `x: Annotated[list, add]` | конкатенация; сбросить присваиванием нельзя |
| `messages: Annotated[list, add_messages]` | добавление, замена по `id`, удаление `RemoveMessage(id=...)`, очистка `RemoveMessage(id=REMOVE_ALL_MESSAGES)` |
| свой редьюсер `(left, right) -> new` | `left` может быть пустым на первом обновлении |

Правила: узел возвращает **только изменённые** поля; ключ вне схемы отбрасывается молча; узлы одного шага видят состояние на начало шага; входное состояние — только для чтения.

## Маршрутизация

```python
def router(state: State) -> Literal["a", "b"]: ...        # аннотация обязательна для схемы
builder.add_conditional_edges("src", router)

def node(state) -> Command[Literal["a", "b"]]:            # то же через Command
    return Command(update={...}, goto="a")

return [Send("worker", {"часть": x}) for x in items]      # веер задач
Command(goto=..., graph=Command.PARENT)                   # передача в родительский граф (без Literal!)
```

## Инструменты

```python
@tool
def search(query: str, runtime: ToolRuntime) -> str:
    """Что делает и КОГДА применять — это часть промпта."""
    runtime.state, runtime.context, runtime.store, runtime.tool_call_id, runtime.stream_writer

model = init_chat_model(os.environ["TUTOR_MODEL"]).bind_tools(TOOLS)   # без bind_tools вызовов не будет
builder.add_node("tools", ToolNode(TOOLS, handle_tool_errors="текст для модели"))
builder.add_conditional_edges("model", tools_condition)   # -> "tools" | "__end__"
builder.add_edge("tools", "model")
```

Инструмент, возвращающий `Command`, **сам** создаёт `ToolMessage(content=..., tool_call_id=runtime.tool_call_id)`.

## Память

```python
config = {"configurable": {"thread_id": "user:course"}}   # до 255 символов
graph.get_state(config)                                   # values, next, config, metadata, tasks, interrupts
graph.get_state_history(config)                           # от новых к старым
graph.update_state(config, {...}, as_node="answer")       # правка; as_node задаёт, откуда продолжать
graph.invoke(None, снимок.config)                         # запуск от старого снимка

store.put(("students", uid, "facts"), "k", {...}, ttl=...)
store.search(("students", uid), query="...", filter={...}, limit=10)
```

Чекпойнтер на Postgres: `AsyncPostgresSaver.from_conn_string(dsn)` + **`await saver.setup()` один раз**.

## Человек в цикле

```python
choice = interrupt({"вопрос": ..., "данные": ...})        # значение уходит вызывающему
graph.invoke(Command(resume="ответ"), config)
graph.invoke(Command(resume={i.id: ответ для i}), config)  # если прерываний несколько
```

- Узел после возобновления выполняется **с начала** → всё необратимое ставить после `interrupt`.
- Нужен чекпойнтер.
- Статические паузы (`interrupt_before=[...]`) значения не передают, в `__interrupt__` не видны, продолжаются вызовом с `None`.

## Стриминг

| `stream_mode` | Что приходит |
|---|---|
| `values` | всё состояние после шага (в веб-интерфейс не отдавать) |
| `updates` | `{"узел": {изменения}}` — основной режим |
| `messages` | `(токен, метаданные)`; фильтровать по `meta["langgraph_node"]` |
| `custom` | то, что отправили через `get_stream_writer()` |
| `tasks` / `checkpoints` / `debug` | диагностика |

Несколько режимов: `stream_mode=["updates", "messages"]` → элементы `(режим, данные)`.
Экспериментальное: `astream_events(..., version="v3")` → проекции `values`, `messages`, `lifecycle`, `subgraphs`, `interrupts`, `output`.

## Надёжность

```python
RetryPolicy(max_attempts=3, initial_interval=0.5, backoff_factor=2.0,
            max_interval=8.0, jitter=True, retry_on=(ConnectionError, TimeoutError))

def handler(state: State, error: NodeError) -> Command:   # вызывается ПОСЛЕ исчерпания повторов
    return Command(update={...}, goto="fallback")

CachePolicy(ttl=300, key_func=...)  +  builder.compile(cache=InMemoryCache())

control = RunControl(); control.request_drain("деплой")   # -> GraphDrained, состояние сохранено
graph.invoke(None, config, control=RunControl())          # продолжить после слива
```

## Композиция

```python
builder.add_node("sub", подграф)                          # общие поля связываются по именам
def wrap(state): return {"поле": подграф.invoke({...})["результат"]}   # разные схемы

@entrypoint(checkpointer=saver)                            # Functional API
def run(x):
    futures = [step(i) for i in items]                     # параллельно
    return summarize([f.result() for f in futures])
```

## Командная строка и конфигурация

```json
{"dependencies": ["."], "graphs": {"tutor": "./tutor/graph.py:graph"}, "env": "./.env"}
```

`langgraph dev` — локальный сервер и Studio · `validate` · `build` · `up` · `dockerfile` · `new` · `deploy`

## Порядок действий при отладке

1. `print(graph.get_graph().draw_mermaid())` — те ли рёбра, все ли ветки видны.
2. `get_state(config)` — `next` пустой? непустой = ждёт или прервался.
3. `get_state_history(config)` — на каком шаге поле стало не тем.
4. Трейс (`LANGSMITH_TRACING=true`) — что реально ушло в модель.
5. `stream_mode="tasks"` — где падает и сколько длится.
6. Повтор от нужного снимка: `invoke(None, снимок.config)`.

## Частые ошибки за одну минуту

| Симптом | Причина |
|---|---|
| Поле осталось пустым, ошибки нет | опечатка в ключе возвращаемого словаря |
| `InvalidUpdateError: only one value per step` | параллельная запись в поле без редьюсера |
| Ветвления пропали со схемы | нет `Literal` / `destinations` / списка целей |
| Агент не зовёт инструменты | забыт `bind_tools` |
| Ошибка протокола у провайдера | `tool_call` без `ToolMessage` или обрезка разорвала пару |
| Действие выполнилось дважды | побочный эффект до `interrupt` |
| Сборщик увидел часть результатов | забыт `defer=True` |
| Интерфейс замирает на самом долгом месте | забыт `subgraphs=True` |
| «Стрим не работает» | буферизация прокси: `X-Accel-Buffering: no` |
| `AttributeError: 'NoneType' has no attribute ...` в узле | не передан `context=` |
| `Found edge ending at unknown node` | `Literal` у узла с `graph=Command.PARENT` |
