# 卡组

## 构建

1. 执行 `pnpm i`；
2. 执行 `pnpm run build`；
3. 找到 `./dist/mod.toml`，该文件即为输出的插件文件成品。建议使用时改个名，<wbr>
   以方便区分不同插件。

## 用法

参见 [USAGE.md](./USAGE.md)。

## TODO

### 命令

- 标记：
  - `<…>` = 应填充 “…” 所表示的内容，
  - `(…|…)` = 其中的任意一个 “…”。

- 其他事项：
  - [ ] 若 `<卡组名>` 以 `.` 开头，则将其视为消息发送者的个人卡组。不同消息<wbr>
        发送者之间的个人卡组相互独立。
  - 仅有以下命令允许在私聊中使用：“卡组”“卡组帮助”“卡组列表”“：”“：列表”<wbr>
    “：查看”“：手牌列表”。

#### 插件

- 信息：
  - [x] `卡组`
  - [x] `卡组帮助`
  - [x] `卡组列表`
- 领域设置：
  - [x] `卡组领域设置…`

#### 卡组存在

- [x] `卡组：<卡组名> 创建 …`
- [x] `卡组：<卡组名> 销毁`
- [ ] `卡组：<卡组名> 导出`
- [ ] `卡组：<卡组名> 导入(创建|覆盖) …`
- [x] `卡组：<卡组名> 克隆为 …`
- [x] `卡组：<卡组名> 重命名为 …`

#### 卡组

- 信息：
  - [x] `卡组：<卡组名>`
  - [x] `卡组：<卡组名> 列表`
  - [x] `卡组：<卡组名> 查看 …`
- 设置：
  - [x] `卡组：<卡组名> 设置 …`
- 抽牌堆：
  - [x] `卡组：<卡组名> 添加(于(顶部|底部))? …`
  - [x] `卡组：<卡组名> 删除 …`
  - [x] `卡组：<卡组名> 洗牌`
  - [ ] `卡组：<卡组名> 回收全部并洗牌`
- 抽卡：
  - [x] `卡组：<卡组名> 抽卡(至私聊)? …`
  - [ ] `卡组：<卡组名> 窥视(至私聊)? …`

#### 卡组弃牌堆

- [x] `卡组：<卡组名> 弃牌堆列表`
- [ ] `卡组：<卡组名> 弃牌堆回收(于(顶部|底部))? …`
- [x] `卡组：<卡组名> 弃牌堆回收全部并洗牌`
- [x] `卡组：<卡组名> 弃牌堆删除全部`

#### 卡组手牌

- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 列表 …`
- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 加入 …`
- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 丢弃 …`
- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 丢弃全部 …`
- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 回收(于(顶部|底部))? …`
- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 回收全部(于(顶部|底部))? …`
- [ ] `卡组：<卡组名> 手牌(：<@所属者>)? 转让至 …`

#### 卡组之间

- [ ] `卡组：<卡组名> 全部添加至 …`
- [ ] `卡组：<卡组名> 挑选添加至 …+`
- [ ] `卡组：<卡组名> 挑选转移至 …+`

### 领域属性

- [ ] 自动生成 USAGE。

---

- [x] `管理员`
- [x] `默认卡组`
- [x] `卡组卡牌上限`
- …

### 卡组旗帜

- [ ] 自动生成 USAGE。

---

- 放回（相互排斥）：
  - [x] `放回`：抽卡后将卡牌放回卡组，一次性抽多张卡牌时，各次抽卡独立。（默认）
  - [x] `不放回`：抽卡后不将卡牌放回卡组，而是根据旗帜放入弃牌堆或抽卡者的手牌。
  - [x] `放回不重复`：抽卡后将卡牌放回卡组，一次性抽多张卡牌时，不会抽到同<wbr>
        一种卡。
  - [x] `放回不独立`：抽卡后将卡牌放回卡组，一次性抽多张卡牌时，不会抽到同<wbr>
        一张卡。
- 不放回处理：
  - [x] `弃牌堆`：只在 “+不放回” 时可用，卡牌被丢弃时放入弃牌堆，而非直接删<wbr>
        除。（默认）
  - [ ] `手牌`：只在 “+不放回” 时可用，抽到的卡牌放入抽卡者的手牌，而非直接<wbr>
        丢弃。
- 保密：
  - [ ] `私聊添加`：允许通过私聊添加卡牌，卡组公开的日志会包含此次添加。
  - [ ] `保密描述`：私聊添加的卡牌，其描述在卡组列表和公开日志中隐藏。
- 冻结（互相排斥）：
  - [ ] `冻结`：不允许编辑卡组。（但仍可查看卡组，或执行如 “挑选添加至” <wbr>
        这类卡组命令。）
  - [ ] `模板`：除了通过 “：克隆为” 得到的新卡组失去此旗帜外，与 `+冻结` 相同。
  - [ ] `收卡`：只允许为卡组添加新卡，或者由卡牌的添加者删除自己添加的卡牌。
  - [ ] `闸停`：不允许为卡组添加新卡，但允许其他操作。（如不放回抽卡，回收手牌。）
- 伪旗帜：
  - [x] `领域默认`：如果卡组是当前领域的默认卡组，则视为其拥有该旗帜。为卡<wbr>
        组添加该旗帜相当于 “卡组领域设置<换行>默认卡组 <卡组名>”。

        - 此后可以通过 `：…` 代替 `卡组：<卡组名> …`。
- …

### 卡组属性

- [ ] 自动生成 USAGE。

---

- [ ] `日志输出群`：公开日志输出到的群组。
- …
