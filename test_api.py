import requests
import json

def test_api():
    base_url = "http://localhost:3000/api"
    
    # 测试单词书 API
    print("测试单词书 API...")
    try:
        # 使用有效的 UUID 格式
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        response = requests.get(f"{base_url}/wordbooks?userId={test_user_id}", timeout=10)
        print(f"  状态码: {response.status_code}")
        if response.status_code == 200:
            print(f"  响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)[:500]}")
        else:
            print(f"  错误: {response.text[:500]}")
    except Exception as e:
        print(f"  请求失败: {e}")
    
    print("\n测试学习序列 API...")
    try:
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        response = requests.get(f"{base_url}/learning-sequence?userId={test_user_id}", timeout=10)
        print(f"  状态码: {response.status_code}")
        if response.status_code == 200:
            print(f"  响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)[:500]}")
        else:
            print(f"  错误: {response.text[:500]}")
    except Exception as e:
        print(f"  请求失败: {e}")

if __name__ == '__main__':
    test_api()
