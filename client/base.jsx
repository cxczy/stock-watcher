import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import zhCN from "antd/locale/zh_CN"
import { ConfigProvider } from "antd"
import "@ant-design/v5-patch-for-react-19"
import { useAtomValue } from "jotai"
import { tokenAtom } from "./auth/authAtom"
import Auth from "./auth"
import StockAnalysis from "./components/StockAnalysis"
dayjs.locale("zh-cn")

function Base() {
  const token = useAtomValue(tokenAtom)
  return (
    <ConfigProvider locale={zhCN}>
      {token ? <StockAnalysis /> : <Auth />}
    </ConfigProvider>
  )
}

export default () => <Base />
