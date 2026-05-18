# syntax=docker/dockerfile:1.7
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

COPY requirements.txt .

# Install system dependencies for OpenCV and AI models if needed
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 --upgrade pip setuptools wheel

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 "cython>=0.29.37,<4.0.0"

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 "numpy>=1.26.4,<2.0.0"

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 --index-url https://download.pytorch.org/whl/cpu torch==2.2.2 torchvision==0.17.2

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 --prefer-binary opencv-python==4.10.0.84 scipy==1.15.3 scikit-image==0.23.2

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 --no-build-isolation --prefer-binary -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
