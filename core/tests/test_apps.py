from core.apps import CoreConfig


def test_core_app_name():
    assert CoreConfig.name == "core"
