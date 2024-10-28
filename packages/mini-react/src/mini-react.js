(function() {
    // 创建虚拟DOM节点
    function createElement(type, props, ...children) {
        return {
            type,
            props: {
                ...props,
                children: children.map((child) => {
                    const isTextNode = typeof child === "string" || typeof child === "number";
                    return isTextNode ? createTextNode(child) : child;
                }),
            },
        };
    }

    // 创建文本节点
    function createTextNode(nodeValue) {
        return {
            type: "TEXT_ELEMENT",
            props: {
                nodeValue,
                children: []
            },
        };
    }

    // 工作单元（Fiber）相关变量
    let nextUnitOfWork = null; // 下一个工作单元
    let wipRoot = null; // 当前正在构建的Fiber树
    let currentRoot = null; // 当前已渲染的Fiber树
    let deletions = null; // 需要删除的Fiber节点列表

    // 渲染函数，初始化新的Fiber树
    function render(element, container) {
        debugger
        wipRoot = {
            dom: container,
            props: {
                children: [element],
            },
            alternate: currentRoot, // 当前Fiber树的引用
        };

        deletions = []; // 重置删除列表

        nextUnitOfWork = wipRoot; // 设置下一个工作单元为新的Fiber树根
    }

    // 主工作循环，利用浏览器空闲时间进行任务调度
    function workLoop(deadline) {
        let shouldYield = false;
        while (nextUnitOfWork && !shouldYield) {
            nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 处理当前工作单元
            shouldYield = deadline.timeRemaining() < 1; // 检查是否需要让出CPU时间
        }

        if (!nextUnitOfWork && wipRoot) {
            commitRoot(); // 如果所有工作单元都已完成，提交新的Fiber树
        }

        requestIdleCallback(workLoop); // 请求下一个空闲时间回调
    }

    requestIdleCallback(workLoop); // 启动主工作循环

    // 处理单个工作单元
    function performUnitOfWork(fiber) {
        const isFunctionComponent = fiber.type instanceof Function;
        if (isFunctionComponent) {
            updateFunctionComponent(fiber); // 更新函数组件
        } else {
            updateHostComponent(fiber); // 更新原生组件
        }
        if (fiber.child) {
            return fiber.child; // 返回子Fiber
        }
        let nextFiber = fiber;
        while (nextFiber) {
            if (nextFiber.sibling) {
                return nextFiber.sibling; // 返回兄弟Fiber
            }
            nextFiber = nextFiber.return; // 返回父Fiber
        }
    }

    let wipFiber = null; // 当前正在处理的Fiber
    let stateHookIndex = null; // 当前状态Hook的索引

    // 更新函数组件
    function updateFunctionComponent(fiber) {
        wipFiber = fiber;
        stateHookIndex = 0;
        wipFiber.stateHooks = []; // 重置状态Hooks
        wipFiber.effectHooks = []; // 重置效果Hooks

        const children = [fiber.type(fiber.props)]; // 调用函数组件，获取子元素
        reconcileChildren(fiber, children); // 对比子元素
    }

    // 更新原生组件
    function updateHostComponent(fiber) {
        if (!fiber.dom) {
            fiber.dom = createDom(fiber); // 创建DOM节点
        }
        reconcileChildren(fiber, fiber.props.children); // 对比子元素
    }

    // 创建DOM节点
    function createDom(fiber) {
        const dom =
            fiber.type == "TEXT_ELEMENT"
                ? document.createTextNode("")
                : document.createElement(fiber.type);

        updateDom(dom, {}, fiber.props); // 更新DOM属性

        return dom;
    }

    // 判断是否为事件属性
    const isEvent = key => key.startsWith("on");
    // 判断是否为普通属性
    const isProperty = key => key !== "children" && !isEvent(key);
    // 判断属性是否为新添加或更改
    const isNew = (prev, next) => key => prev[key] !== next[key];
    // 判断属性是否被移除
    const isGone = (prev, next) => key => !(key in next);

    // 更新DOM属性
    function updateDom(dom, prevProps, nextProps) {
        // 移除旧的或更改的事件监听器
        Object.keys(prevProps)
            .filter(isEvent)
            .filter(
                key => !(key in nextProps) || isNew(prevProps, nextProps)(key)
            )
            .forEach(name => {
                const eventType = name.toLowerCase().substring(2);
                dom.removeEventListener(eventType, prevProps[name]);
            });

        // 移除旧的属性
        Object.keys(prevProps)
            .filter(isProperty)
            .filter(isGone(prevProps, nextProps))
            .forEach(name => {
                dom[name] = "";
            });

        // 设置新的或更改的属性
        Object.keys(nextProps)
            .filter(isProperty)
            .filter(isNew(prevProps, nextProps))
            .forEach(name => {
                dom[name] = nextProps[name];
            });

        // 添加新的事件监听器
        Object.keys(nextProps)
            .filter(isEvent)
            .filter(isNew(prevProps, nextProps))
            .forEach(name => {
                const eventType = name.toLowerCase().substring(2);
                dom.addEventListener(eventType, nextProps[name]);
            });
    }

    // 对比子元素
    function reconcileChildren(wipFiber, elements) {
        let index = 0;
        let oldFiber = wipFiber.alternate?.child;
        let prevSibling = null;

        while (index < elements.length || oldFiber != null) {
            const element = elements[index];
            let newFiber = null;

            const sameType = element?.type == oldFiber?.type;

            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    props: element.props,
                    dom: oldFiber.dom,
                    return: wipFiber,
                    alternate: oldFiber,
                    effectTag: "UPDATE", // 标记为更新
                };
            }
            if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    props: element.props,
                    dom: null,
                    return: wipFiber,
                    alternate: null,
                    effectTag: "PLACEMENT", // 标记为插入
                };
            }
            if (oldFiber && !sameType) {
                oldFiber.effectTag = "DELETION"; // 标记为删除
                deletions.push(oldFiber);
            }

            if (oldFiber) {
                oldFiber = oldFiber.sibling;
            }

            if (index === 0) {
                wipFiber.child = newFiber;
            } else if (element) {
                prevSibling.sibling = newFiber;
            }

            prevSibling = newFiber;
            index++;
        }
    }

    // 状态管理Hook
    function useState(initialState) {
        const currentFiber = wipFiber;
        const oldHook = wipFiber.alternate?.stateHooks[stateHookIndex];

        const stateHook = {
            state: oldHook ? oldHook.state : initialState,
            queue: oldHook ? oldHook.queue : [],
        };

        stateHook.queue.forEach((action) => {
            stateHook.state = action(stateHook.state);
        });

        stateHook.queue = [];

        stateHookIndex++;
        wipFiber.stateHooks.push(stateHook);

        function setState(action) {
            const isFunction = typeof action === "function";
            stateHook.queue.push(isFunction ? action : () => action);
            wipRoot = {
                ...currentFiber,
                alternate: currentFiber,
            };
            nextUnitOfWork = wipRoot;
        }

        return [stateHook.state, setState];
    }

    // 副作用管理Hook
    function useEffect(callback, deps) {
        const effectHook = {
            callback,
            deps,
            cleanup: undefined,
        };
        wipFiber.effectHooks.push(effectHook);
    }

    // 提交新的Fiber树
    function commitRoot() {
        deletions.forEach(commitWork); // 处理删除操作
        commitWork(wipRoot.child); // 处理插入和更新操作
        commitEffectHooks(); // 处理副作用
        currentRoot = wipRoot; // 更新当前Fiber树
        wipRoot = null; // 重置工作Fiber树
        deletions = []; // 重置删除列表
    }

    // 提交单个工作单元
    function commitWork(fiber) {
        if (!fiber) {
            return;
        }

        let domParentFiber = fiber.return;
        while (!domParentFiber.dom) {
            domParentFiber = domParentFiber.return
        }
        const domParent = domParentFiber.dom; // 获取父DOM节点

        if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
            domParent.appendChild(fiber.dom); // 插入新的DOM节点
        } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
            updateDom(fiber.dom, fiber.alternate.props, fiber.props); // 更新DOM属性
        } else if (fiber.effectTag === "DELETION") {
            commitDeletion(fiber, domParent); // 删除DOM节点
        }

        commitWork(fiber.child); // 递归处理子Fiber
        commitWork(fiber.sibling); // 递归处理兄弟Fiber
    }

    // 删除Fiber及其子Fiber的DOM节点
    function commitDeletion(fiber, domParent) {
        if (fiber.dom) {
            domParent.removeChild(fiber.dom); // 直接删除DOM节点
        } else {
            commitDeletion(fiber.child, domParent); // 递归删除子Fiber的DOM节点
        }
    }

    // 比较依赖数组是否相等
    function isDepsEqual(deps, newDeps) {
        if (deps.length !== newDeps.length) {
            return false;
        }

        for (let i = 0; i < deps.length; i++) {
            if (deps[i] !== newDeps[i]) {
                return false;
            }
        }
        return true;
    }

    // 处理副作用Hook
    function commitEffectHooks() {
        function runCleanup(fiber) {
            if (!fiber) return;

            fiber.alternate?.effectHooks?.forEach((hook, index) => {
                const deps = fiber.effectHooks[index].deps;

                if (!hook.deps || !isDepsEqual(hook.deps, deps)) {
                    hook.cleanup?.(); // 执行清理函数
                }
            });

            runCleanup(fiber.child);
            runCleanup(fiber.sibling);
        }

        function run(fiber) {
            if (!fiber) return;

            fiber.effectHooks?.forEach((newHook, index) => {
                if (!fiber.alternate) {
                    newHook.cleanup = newHook.callback(); // 执行副作用函数并保存清理函数
                    return;
                }

                if (!newHook.deps) {
                    newHook.cleanup = newHook.callback();
                }

                if (newHook.deps.length > 0) {
                    const oldHook = fiber.alternate?.effectHooks[index];

                    if (!isDepsEqual(oldHook.deps, newHook.deps)) {
                        newHook.cleanup = newHook.callback();
                    }
                }
            });

            run(fiber.child);
            run(fiber.sibling);
        }

        runCleanup(wipRoot); // 先执行清理函数
        run(wipRoot); // 再执行副作用函数
    }

    // 导出MiniReact对象
    const MiniReact = {
        createElement,
        render,
        useState,
        useEffect
    };

    window.MiniReact = MiniReact; // 将MiniReact挂载到全局window对象上
})();
