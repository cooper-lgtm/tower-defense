# 使用腾讯云镜像源加速基础镜像拉取
FROM mirror.ccs.tencentyun.com/library/python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copy source and install dependencies
COPY . /app
RUN pip install --upgrade pip \
 && pip install .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
