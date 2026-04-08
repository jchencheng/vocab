from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 捕获控制台日志
    logs = []
    page.on("console", lambda msg: logs.append(f"{msg.type}: {msg.text}"))
    
    print("=== 测试网站功能 ===")
    print("\n1. 访问首页...")
    page.goto('https://vocab-uxctcgk59-chengchengs-projects-398a16c3.vercel.app')
    page.wait_for_load_state('networkidle')
    
    # 截图
    page.screenshot(path='c:/Users/jchen/Documents/trae_projects/vocab/test_screenshot_home.png')
    print("✓ 首页截图已保存")
    
    # 检查页面内容
    title = page.title()
    print(f"\n页面标题: {title}")
    
    # 检查是否有登录表单
    try:
        email_input = page.locator('input[type="email"]').first
        if email_input.is_visible():
            print("✓ 找到登录表单")
        else:
            print("✗ 未找到登录表单")
    except:
        print("✗ 未找到登录表单")
    
    # 检查控制台错误
    print("\n=== 控制台日志 ===")
    error_logs = [log for log in logs if log.startswith("error:")]
    if error_logs:
        print("发现错误日志:")
        for log in error_logs[:10]:
            print(f"  {log}")
    else:
        print("✓ 没有发现错误日志")
    
    # 检查网络请求
    print("\n=== 网络请求检查 ===")
    
    browser.close()
    print("\n测试完成")
