import requests
import json

def test_import_result():
    base_url = "http://localhost:3000/api"
    test_user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    print("测试单词书 API...")
    try:
        response = requests.get(f"{base_url}/wordbooks?userId={test_user_id}", timeout=10)
        print(f"  状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"\n  系统单词书数量: {len(data.get('systemBooks', []))}")
            for book in data.get('systemBooks', []):
                print(f"    - {book['name']} (ID: {book['id']})")
                print(f"      描述: {book.get('description', 'N/A')}")
                print(f"      单词数: {book.get('word_count', 0)}")
        else:
            print(f"  错误: {response.text[:500]}")
    except Exception as e:
        print(f"  请求失败: {e}")
    
    # 获取第一个系统单词书的详情
    print("\n获取单词书详情...")
    try:
        # 先获取单词书列表
        response = requests.get(f"{base_url}/wordbooks?userId={test_user_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            system_books = data.get('systemBooks', [])
            if system_books:
                book_id = system_books[0]['id']
                detail_response = requests.get(f"{base_url}/wordbooks/{book_id}?userId={test_user_id}", timeout=10)
                if detail_response.status_code == 200:
                    detail = detail_response.json()
                    print(f"  单词书: {detail['name']}")
                    print(f"  统计: {json.dumps(detail.get('stats', {}), indent=2, ensure_ascii=False)}")
                    
                    # 获取单词列表
                    words_response = requests.get(f"{base_url}/wordbooks/{book_id}/words?pageSize=5", timeout=10)
                    if words_response.status_code == 200:
                        words_data = words_response.json()
                        print(f"\n  单词列表 (前5个):")
                        for item in words_data.get('items', []):
                            word = item.get('word', {})
                            print(f"    - {word.get('word', 'N/A')}: {word.get('meanings', [{}])[0].get('definitions', [{}])[0].get('definition', 'N/A')[:50]}")
    except Exception as e:
        print(f"  请求失败: {e}")

if __name__ == '__main__':
    test_import_result()
