from playwright.sync_api import sync_playwright
import time

def test_wordbook_feature():
    with sync_playwright() as p:
        # 使用已安装的 Chrome
        browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        page = browser.new_page()
        
        try:
            # 访问首页
            print("访问首页...")
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')
            
            # 截图查看初始状态
            page.screenshot(path='test_screenshots/01_initial.png', full_page=True)
            print("已截图: 01_initial.png")
            
            # 检查是否有登录页面
            if page.locator('text=Sign In').count() > 0 or page.locator('text=登录').count() > 0:
                print("检测到登录页面，需要登录")
                # 这里可以添加登录逻辑
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
                    if page.locator('text=单词书').count() > 0:
                        print("✅ 单词书页面已加载")
                    
                    if page.locator('text=我的学习序列').count() > 0:
                        print("✅ 找到'我的学习序列'区域")
                    
                    if page.locator('text=学习模式').count() > 0:
                        print("✅ 找到学习模式选择器")
                    
                    if page.locator('text=添加单词书').count() > 0:
                        print("✅ 找到'添加单词书'按钮")
                        
                else:
                    print("❌ 未找到'单词书'导航项")
                    # 输出所有导航项
                    nav_items = page.locator('nav button').all()
                    print("可用导航项:")
                    for item in nav_items:
                        print(f"  - {item.inner_text()}")
            
            print("\n测试完成!")
            
        except Exception as e:
            print(f"测试出错: {e}")
            page.screenshot(path='test_screenshots/error.png', full_page=True)
        finally:
            browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('test_screenshots', exist_ok=True)
    test_wordbook_feature()
