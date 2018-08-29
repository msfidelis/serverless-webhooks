# Serverless Webhooks Processing Microservice

## Table of Contents 

## Stack 

## How to Run 

1) Clone this repository

```bash
git clone git@github.com:Superlogica/serverless-webhooks.git
```

2) Install dependencies 

```bash
npm install
```

3) Deploy

```bash
serverless deploy -v
```

# Workflows 

## Creating a Webhook 

* **targe_url**: callback url
* **method**: request method to send webhook
* **hook_name**: simple webhook identifier
* **client**: a client name, it's works to find a webhook group
* **headers**: webhook request headers
* **payload**: webhook request body

> [POST] /webhooks

```bash
curl -X POST -H "Content-type:application/json" -d \
'{
  "target_url" : "http://demo4290800.mockable.io/hooktest",
  "method": "POST",
  "datetime": "01/02/2018",
  "client": "raj",
  "hook_name": "create a receipt",
  "headers" : {
        "My-Header" : "Tiranossaur",
        "API-KEYS" : "123123123",
        "Content-type": "application/json"
    },
  "payload" : {
        "foo": "bar",
        "id": 1212,
        "book" : {
                "name" : "American Gods",
                "author": "Neil Gaiman",
                "year": "2001"
        }
  }
}' https://5omvj77ua5.execute-api.us-east-1.amazonaws.com/prod/webhooks -i
```

### Output

```json
{
  "webhook": {
    "payload": "{\"foo\":\"bar\",\"id\":1212,\"book\":{\"name\":\"American Gods\",\"author\":\"Neil Gaiman\",\"year\":\"2001\"}}",
    "status_hook": "success",
    "error_response": "NULL",
    "hashkey": "7fd2bd20-bf85-561a-9cd8-4029a8560e6b",
    "client": "raj",
    "hook_name": "create a receipt",
    "payload_hash": "9f610bebe327f1b9c807443bf0e44150bde31803",
    "target_url": "http://demo4290800.mockable.io/hooktest",
    "success_response": "{\"status\":200}",
    "headers": "{\"My-Header\":\"Tiranossaur\",\"API-KEYS\":\"123123123\",\"Content-type\":\"application/json\"}",
    "retry": 1,
    "method": "POST"
  },
  "hateoas": {
    "webhook_status": {
      "method": "GET",
      "endpoint": "/webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b"
    },
    "webhook_cancel": {
      "method": "DELETE",
      "endpoint": "webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b"
    },
    "webhook_force": {
      "method": "POST",
      "endpoint": "/webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b/force"
    }
  }
}
```

## Consulting a Webhook

> [GET] /webhooks/{hashkey}

Informing a hashkey on endpoint, you can get a status from a simple webhook execution

```bash
curl -X GET https://5omvj77ua5.execute-api.us-east-1.amazonaws.com/prod/webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b
```

## Canceling a Webhook Execution 

> [DELETE] /webhooks/hashkey

Informing a hashkey on andpoint for cancel a webhook execution 

```bash
curl -X DELETE https://5omvj77ua5.execute-api.us-east-1.amazonaws.com/prod/webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b
```

### Output 

```json
{
  "status": 200,
  "message": "Webhook 8c866762-f06e-bf34-475e-c8678b680026 canceled",
  "webhook": {
      // ...
  },
  "hateoas": {
    "webhook_status": {
      "method": "GET",
      "endpoint": "/webhooks/8c866762-f06e-bf34-475e-c8678b680026"
    },
    "webhook_force": {
      "method": "POST",
      "endpoint": "/webhooks/8c866762-f06e-bf34-475e-c8678b680026/force"
    }
  }
}
```

## Webhooks Status 

* **pending**: loko
* **success**: loko
* **error**: loko
* **canceled**: loko
* **locked**: loko

## Hateoas (What I can do with this webhook?)

All of API's will return a hateos with actions for a created or searched objects.  

```bash
  "hateoas": {
    "webhook_status": {
      "method": "GET",
      "endpoint": "/webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b"
    },
    "webhook_cancel": {
      "method": "DELETE",
      "endpoint": "webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b"
    },
    "webhook_force": {
      "method": "POST",
      "endpoint": "/webhooks/7fd2bd20-bf85-561a-9cd8-4029a8560e6b"
    }
  }
```

### Webhook Processing

> 

## API 

### Creating a Webhook

> POST

### Get Webhook Status

> GET

### Cancel an Webhook 

> DELETE

### Force Webhook Processing
