import { Button, Input } from "antd"
import { Form } from "antd"
import { Card } from "antd"
import { mutate } from "../request"
import store from "../shared/store"
import { tokenAtom } from "./authAtom"
import { message } from "antd"
export default function Auth() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px]">
      <Card title="登录">
        <Form
          layout="vertical"
          initialValues={{
            username: "",
            password: "",
          }}
          onFinish={(res) => {
            mutate("/api/auth", res).then((res) => {
              store.set(tokenAtom, res.token)
              message.success("登录成功")
            })
          }}
        >
          <Form.Item label="用户名" name="username">
            <Input aria-label="登录用户名" />
          </Form.Item>
          <Form.Item label="密码" name="password">
            <Input.Password aria-label="登录密码" />
          </Form.Item>
          <Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              block
              aria-label="登录按钮"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
