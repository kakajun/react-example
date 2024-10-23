import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';

function useInterval(fn: Function, time: number) {
    const savedFn = useRef(fn);

    // 确保每次 fn 更新时，savedFn.current 都是最新的 fn
    useEffect(() => {
        savedFn.current = fn;
    }, [fn]);

    useEffect(() => {
        const tick = () => savedFn.current();
        console.log("1");
        const timer = setInterval(tick, time);

        return () =>{
            console.log("销毁");

            clearInterval(timer)
        };
    }, [time]);
}

function App() {
    const [count, setCount] = useState(0);

    const updateCount = () => {
        setCount(count + 1);
    };

    useInterval(updateCount, 1000);

    return <div>{count}</div>;
}

export default App;
