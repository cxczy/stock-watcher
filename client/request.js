import { message } from "antd"

const getResult = (res) => {
  if (res.status >= 200 && res.status < 400) {
    return res.json()
  } else {
    return res.text().then((text) => {
      message.error(text)
      throw new Error(text)
    })
  }
}

export function query(url) {
  return fetch(url).then(getResult)
}

export function mutate(url, data) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then(getResult)
}
