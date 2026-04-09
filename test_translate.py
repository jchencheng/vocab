from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 监听控制台日志
    page.on("console", lambda msg: print(f"[Console {msg.type}]: {msg.text}"))
    
    # 访问首页
    print("Opening homepage...")
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    
    # 截图查看页面状态
    page.screenshot(path='test_homepage.png', full_page=True)
    print("Screenshot saved: test_homepage.png")
    
    # 尝试点击添加单词按钮或导航到添加单词页面
    try:
        # 查找添加单词的链接或按钮
        add_word_link = page.locator('text=Add Word').first
        if add_word_link.is_visible():
            print("Clicking 'Add Word' link...")
            add_word_link.click()
            page.wait_for_load_state('networkidle')
            time.sleep(1)
    except Exception as e:
        print(f"Could not click Add Word: {e}")
    
    # 截图查看添加单词页面
    page.screenshot(path='test_addword.png', full_page=True)
    print("Screenshot saved: test_addword.png")
    
    # 尝试填写单词并获取释义
    try:
        # 查找单词输入框
        word_input = page.locator('input[placeholder*="word" i]').first
        if word_input.is_visible():
            print("Entering word 'hello'...")
            word_input.fill('hello')
            
            # 查找 Get Definitions 按钮
            get_def_button = page.locator('text=Get Definitions').first
            if get_def_button.is_visible():
                print("Clicking 'Get Definitions' button...")
                get_def_button.click()
                time.sleep(2)  # 等待API响应
                
                # 截图查看结果
                page.screenshot(path='test_definitions.png', full_page=True)
                print("Screenshot saved: test_definitions.png")
                
                # 查找 Translate to Chinese 按钮
                translate_button = page.locator('text=Translate to Chinese').first
                if translate_button.is_visible():
                    print("Clicking 'Translate to Chinese' button...")
                    translate_button.click()
                    time.sleep(3)  # 等待翻译API响应
                    
                    # 截图查看翻译结果
                    page.screenshot(path='test_translation.png', full_page=True)
                    print("Screenshot saved: test_translation.png")
                    
                    # 检查是否有中文释义
                    chinese_input = page.locator('textarea[placeholder*="中文" i], input[placeholder*="中文" i]').first
                    if chinese_input:
                        value = chinese_input.input_value()
                        print(f"Chinese definition value: {value}")
    except Exception as e:
        print(f"Error during test: {e}")
    
    browser.close()
    print("Test completed!")
