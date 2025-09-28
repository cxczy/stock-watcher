import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import zhCN from "antd/locale/zh_CN"
import { ConfigProvider } from "antd"
import "@ant-design/v5-patch-for-react-19"
import AppRouter from "./router"
dayjs.locale("zh-cn")

function Base() {
  return (
    <ConfigProvider locale={zhCN}>
      <AppRouter />
    </ConfigProvider>
  )
}

export default () => <Base />
