def test_celery_registers_processing_tasks():
    from workers.celery_app import celery_app

    celery_app.loader.import_default_modules()
    assert "workers.tasks.process_image_task" in celery_app.tasks
    assert "workers.tasks.process_video_task" in celery_app.tasks
