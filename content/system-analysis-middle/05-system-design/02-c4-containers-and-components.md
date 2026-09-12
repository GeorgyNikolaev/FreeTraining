# C4 Model: Container и Component

C4 показывает систему на нескольких уровнях. Context отвечает «кто и что вокруг системы». **Container** — исполняемое приложение или хранилище, например web-клиент, backend API, PostgreSQL. Это не Docker-контейнер. **Component** — логическая часть внутри одного container.

```text
[Web client] ─HTTPS→ [Booking API] ─SQL→ [PostgreSQL]
                         │
                         ├─GET→ [Redis]
                         └─event→ [Notification provider]
```

Внутри `Booking API`:

```text
[HTTP controller] → [Appointment service] → [Appointment repository]
                              │                    │
                              ├→ [Availability policy]  └→ PostgreSQL
                              └→ [Event publisher]      └→ queue/provider
```

На Container-диаграмме укажите ответственность, технологию и связь. На Component — только значимые внутренние обязанности; не рисуйте каждый класс. C4 — средство разговора о границах. Если компонент одновременно меняет запись, посылает SMS и считает отчёт, граница выбрана плохо.
