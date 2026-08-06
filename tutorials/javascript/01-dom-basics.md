# DOM 操作基础

## 什么是 DOM？

DOM（Document Object Model）是 HTML 文档的编程接口，它将文档表示为节点树。

## 选择元素

```javascript
// 通过 ID
const header = document.getElementById('header');

// 通过选择器
const card = document.querySelector('.card');
const cards = document.querySelectorAll('.card');

// 通过类名
const items = document.getElementsByClassName('item');
```

## 操作内容

```javascript
// 文本内容
element.textContent = '新的文本';

// HTML 内容
element.innerHTML = '<strong>加粗文字</strong>';

// 表单值
input.value = '默认值';
```

## 修改样式

```javascript
// 直接修改
element.style.color = '#333';
element.style.display = 'none';

// 类名操作
element.classList.add('active');
element.classList.remove('hidden');
element.classList.toggle('dark');
element.classList.contains('active');
```

## 创建和删除元素

```javascript
// 创建
const div = document.createElement('div');
div.className = 'new-card';
div.textContent = '新卡片';

// 插入
parent.appendChild(div);
parent.insertBefore(div, referenceNode);

// 删除
element.remove();
parent.removeChild(element);
```

## 事件处理

```javascript
// 添加事件
button.addEventListener('click', (e) => {
    console.log('点击了按钮', e.target);
});

// 事件委托
list.addEventListener('click', (e) => {
    if (e.target.matches('.item')) {
        console.log('点击了列表项');
    }
});
```

## 总结

DOM 操作是前端开发的基石，虽然现代框架封装了这些操作，但理解底层原理仍然非常重要。
