# 解构赋值与展开运算符

## 数组解构

```javascript
const arr = [1, 2, 3];
const [a, b, c] = arr;
// a = 1, b = 2, c = 3

// 跳过元素
const [first, , third] = [1, 2, 3];

// 默认值
const [x = 0, y = 0] = [5];
// x = 5, y = 0

// 交换变量
let m = 1, n = 2;
[m, n] = [n, m];
```

## 对象解构

```javascript
const user = { name: 'Caoxu', age: 25, city: '北京' };
const { name, age } = user;

// 重命名
const { name: userName, age: userAge } = user;

// 默认值
const { role = 'user' } = user;

// 嵌套解构
const { address: { city, country } } = complexObj;
```

## 展开运算符

### 数组展开

```javascript
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];

// 复制数组
const copy = [...arr1];

// 函数参数
Math.max(...[1, 2, 3, 4, 5]);
```

### 对象展开

```javascript
const defaults = { theme: 'light', lang: 'zh' };
const userSettings = { theme: 'dark' };
const settings = { ...defaults, ...userSettings };
// { theme: 'dark', lang: 'zh' }

// Rest 参数
const { id, ...rest } = user;
```

## 实战应用

```javascript
// 函数参数解构
function createUser({ name, email, role = 'user' }) {
    return { name, email, role, createdAt: new Date() };
}

// 合并配置
function mergeConfig(...configs) {
    return Object.assign({}, ...configs);
}
```

## 总结

解构赋值和展开运算符让 JavaScript 代码更简洁优雅，是现代前端开发的基本功。
