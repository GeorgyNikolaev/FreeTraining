import pytest

from app.services.otp import MAX_ATTEMPTS, OtpCooldownError, issue_code, verify_code


async def test_code_is_single_use(redis):
    code = await issue_code(redis, "email_verify", "user-1")
    assert len(code) == 6 and code.isdigit()

    assert (await verify_code(redis, "email_verify", "user-1", code)).ok is True
    assert (await verify_code(redis, "email_verify", "user-1", code)).ok is False


async def test_code_is_bound_to_purpose(redis):
    code = await issue_code(redis, "password_reset", "user-1")
    assert (await verify_code(redis, "email_verify", "user-1", code)).ok is False
    assert (await verify_code(redis, "password_reset", "user-1", code)).ok is True


async def test_code_burns_after_too_many_attempts(redis):
    code = await issue_code(redis, "password_reset", "user-1")
    wrong = "000000" if code != "000000" else "111111"

    for left in range(MAX_ATTEMPTS - 1, -1, -1):
        check = await verify_code(redis, "password_reset", "user-1", wrong)
        assert (check.ok, check.attempts_left) == (False, left)

    assert (await verify_code(redis, "password_reset", "user-1", code)).ok is False


async def test_resend_has_cooldown(redis):
    await issue_code(redis, "email_verify", "user-1")
    with pytest.raises(OtpCooldownError):
        await issue_code(redis, "email_verify", "user-1")
