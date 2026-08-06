# 箭头函数与模板字符串

## 箭头函数

箭头函数是 ES6 引入的简洁函数语法：

```javascript
// 传统函数
function add(a, b) {
    return a + b;
}

// 箭头函数
const add = (a, b) => a + b;

// 单参数可省略括号
const square = x => x * x;

// 多行需要花括号和 return
const complex = (a, b) => {
    const result = a * b;
    return result * 2;
};
```

### this 绑定

箭头函数不绑定自己的 `this`，它会捕获其所在上下文的 `this` 值：

```javascript
class Timer {
    constructor() {
        this.seconds = 0;
    }
    start() {
        setInterval(() => {
            this.seconds++; // this 指向 Timer 实例
        }, 1000);
    }
}
```

## 模板字符串

使用反引号创建多行字符串和字符串插值：

```javascript
const name = 'Caoxu';
const greeting = `你好，${name}！
欢迎来到我的博客。`;

// 多行字符串
const html = `
<div class="card">
    <h2>${title}</h2>
    <p>${description}</p>
</div>
`;
```

### 标签模板

```javascript
function highlight(strings, ...values) {
    return strings.reduce((result, str, i) =>
        `${result}${str}${values[i] ? `<strong>${values[i]}</strong>` : ''}`
    , '');
}

const result = highlight`Hello ${name}, you have ${count} messages`;
```

## 总结

箭头函数和模板字符串是 ES6 中最常用的特性，掌握它们能大大提升代码的可读性和开发效率。
