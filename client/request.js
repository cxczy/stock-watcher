import { message } from "antd"

const getAuth = () => ({
  Authorization: "Bearer " + localStorage.getItem("token"),
})

const getResult = (res) => {
  if (res.status >= 200 && res.status < 400) {
    return res.json()
  } else if (res.status === 401) {
    const text = "登录已过期，请重新登录"
    message.error(text)
    throw new Error(text)
  } else {
    return res.text().then((text) => {
      message.error(text)
      throw new Error(text)
    })
  }
}

export function query(url) {
  return fetch(url, {
    headers: {
      ...getAuth(),
    },
  }).then(getResult)
}

export function mutate(url, data) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuth(),
    },
    body: JSON.stringify(data),
  }).then(getResult)
}
