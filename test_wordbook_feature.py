from playwright.sync_api import sync_playwright
import time

def test_wordbook_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        page = browser.new_page()
        
        try:
            print("访问首页...")
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')
            time.sleep(3)  # 等待页面完全加载
            
            # 截图查看初始状态
            page.screenshot(path='test_screenshots/01_home.png', full_page=True)
            print("已截图: 01_home.png")
            
            # 检查是否有登录页面
            if page.locator('text=Sign In').count() > 0 or page.locator('text=Sign in').count() > 0:
                print("检测到登录页面，需要登录才能测试单词书功能")
                print("请手动登录后测试，或提供测试账号")
                
                # 显示登录表单字段
                print("\n页面上的输入字段:")
                inputs = page.locator('input').all()
                for i, inp in enumerate(inputs):
                    placeholder = inp.get_attribute('placeholder') or ''
                    input_type = inp.get_attribute('type') or 'text'
                    print(f"  [{i}] type={input_type}, placeholder={placeholder}")
                
            else:
                print("页面已加载，检查导航栏...")
                
                # 检查是否有"单词书"导航项
                wordbook_nav = page.locator('text=单词书')
                if wordbook_nav.count() > 0:
                    print("✅ 找到'单词书'导航项")
                    
                    # 点击单词书导航
                    wordbook_nav.first.click()
                    page.wait_for_load_state('networkidle')
                    time.sleep(1)
                    
                    page.screenshot(path='test_screenshots/02_wordbook_page.png', full_page=True)
                    print("已截图: 02_wordbook_page.png")
                    
                    # 检查页面内容
                    if page.locator('text=我的学习序列').count() > 0:
                        print("✅ 找到'我的学习序列'区域")
                    
                    if page.locator('text=学习模式').count() > 0:
                        print("✅ 找到学习模式选择器")
                    
                    if page.locator('text=添加单词书').count() > 0:
                        print("✅ 找到'添加单词书'按钮")
                        
                    # 检查系统单词书区域
                    if page.locator('text=系统单词书').count() > 0:
                        print("✅ 找到'系统单词书'区域")
                    else:
                        print("ℹ️ 暂无系统单词书（需要在数据库中插入）")
                        
                else:
                    print("❌ 未找到'单词书'导航项")
                    # 输出所有导航项
                    nav_items = page.locator('nav button').all()
                    print("可用导航项:")
                    for item in nav_items:
                        text = item.inner_text()
                        if text:
                            print(f"  - {text}")
            
            print("\n测试完成!")
            
        except Exception as e:
            print(f"测试出错: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='test_screenshots/error.png', full_page=True)
        finally:
            browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('test_screenshots', exist_ok=True)
    test_wordbook_feature()
