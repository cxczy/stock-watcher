import { test, expect } from "@playwright/test"

// 注意，e2e 测试仅仅针对开发环境（因为是同构项目）
test("登录流程", async ({ page }) => {
  // 打开首页
  await page.goto("http://localhost:3000")
  // 等待登录表单出现
  await page.waitForSelector('input[aria-label="登录用户名"]')
  // 输入用户名和密码
  await page.getByLabel("登录用户名").fill("admin")
  await page.getByLabel("登录密码").fill("1234")
  // 点击登录按钮
  await page.getByLabel("登录按钮").click()
  // 等待登录成功提示
  await expect(page.getByText("登录成功")).toBeVisible()
  // 检查 localStorage 是否有 token
  const token = await page.evaluate(() =>
    localStorage.getItem("dev_admin_token")
  )
  expect(token).not.toBeTruthy()
})
