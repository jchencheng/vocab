from playwright.sync_api import sync_playwright
import time

def test_wordbook_with_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        page = browser.new_page()
        
        try:
            print("访问首页...")
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            
            # 截图查看初始状态
            page.screenshot(path='test_screenshots/01_login.png', full_page=True)
            print("已截图: 01_login.png")
            
            # 检查是否在登录页面
            if page.locator('text=Sign In').count() > 0 or page.locator('text=Sign in').count() > 0:
                print("检测到登录页面，尝试注册新账号...")
                
                # 点击 Sign up 链接
                sign_up_link = page.locator('text=Sign up')
                if sign_up_link.count() > 0:
                    sign_up_link.first.click()
                    page.wait_for_load_state('networkidle')
                    time.sleep(1)
                    
                    # 填写注册表单
                    test_email = f"test_{int(time.time())}@example.com"
                    test_password = "Test123456"
                    
                    print(f"使用测试账号: {test_email}")
                    
                    # 填写邮箱
                    email_input = page.locator('input[type="email"]').first
                    email_input.fill(test_email)
                    
                    # 填写密码
                    password_input = page.locator('input[type="password"]').first
                    password_input.fill(test_password)
                    
                    # 点击注册按钮
                    submit_button = page.locator('button[type="submit"]').first
                    if submit_button.count() > 0:
                        submit_button.click()
                    else:
                        # 尝试找包含 Sign Up 文本的按钮
                        sign_up_btn = page.locator('button:has-text("Sign Up")').first
                        sign_up_btn.click()
                    
                    page.wait_for_load_state('networkidle')
                    time.sleep(3)
                    
                    page.screenshot(path='test_screenshots/02_after_signup.png', full_page=True)
                    print("已截图: 02_after_signup.png")
                
                # 检查是否登录成功（看是否有导航栏）
                nav = page.locator('nav').first
                if nav.count() > 0:
                    print("✅ 登录成功，找到导航栏")
                else:
                    print("⚠️ 可能还在登录页面，尝试直接登录...")
                    # 尝试直接登录
                    email_input = page.locator('input[type="email"]').first
                    if email_input.count() > 0:
                        email_input.fill(test_email)
                        password_input = page.locator('input[type="password"]').first
                        password_input.fill(test_password)
                        
                        sign_in_btn = page.locator('button:has-text("Sign In")').first
                        sign_in_btn.click()
                        page.wait_for_load_state('networkidle')
                        time.sleep(3)
                        
                        page.screenshot(path='test_screenshots/03_after_login.png', full_page=True)
                        print("已截图: 03_after_login.png")
            
            # 现在检查导航栏
            print("\n检查导航栏...")
            nav_buttons = page.locator('nav button').all()
            print(f"找到 {len(nav_buttons)} 个导航按钮")
            
            for i, btn in enumerate(nav_buttons):
                text = btn.inner_text()
                if text:
                    print(f"  [{i}] {text}")
            
            # 查找"单词书"导航项
            wordbook_nav = page.locator('nav button:has-text("单词书")')
            if wordbook_nav.count() > 0:
                print("\n✅ 找到'单词书'导航项!")
                
                # 点击单词书导航
                wordbook_nav.first.click()
                page.wait_for_load_state('networkidle')
                time.sleep(2)
                
                page.screenshot(path='test_screenshots/04_wordbook_page.png', full_page=True)
                print("已截图: 04_wordbook_page.png")
                
                # 检查页面内容
                content_checks = [
                    ('我的学习序列', '我的学习序列区域'),
                    ('学习模式', '学习模式选择器'),
                    ('添加单词书', '添加单词书按钮'),
                    ('系统单词书', '系统单词书区域'),
                ]
                
                print("\n检查页面内容:")
                for text, desc in content_checks:
                    if page.locator(f'text={text}').count() > 0:
                        print(f"  ✅ 找到'{desc}'")
                    else:
                        print(f"  ❌ 未找到'{desc}'")
                
                # 检查学习模式选择器
                study_mode = page.locator('select')
                if study_mode.count() > 0:
                    print("\n✅ 找到学习模式下拉框")
                    # 获取选项
                    options = study_mode.locator('option').all()
                    print("  可用选项:")
                    for opt in options:
                        print(f"    - {opt.inner_text()}")
                
            else:
                print("\n❌ 未找到'单词书'导航项")
                # 输出页面所有文本
                print("\n页面上的所有按钮文本:")
                all_buttons = page.locator('button').all()
                for btn in all_buttons:
                    text = btn.inner_text()
                    if text and len(text.strip()) > 0:
                        print(f"  - '{text}'")
            
            print("\n测试完成!")
            
        except Exception as e:
            print(f"\n测试出错: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='test_screenshots/error.png', full_page=True)
            print("已截图: error.png")
        finally:
            browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('test_screenshots', exist_ok=True)
    test_wordbook_with_login()
