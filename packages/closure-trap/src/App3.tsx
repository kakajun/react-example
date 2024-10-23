import { useEffect, useState, useRef, useLayoutEffect } from 'react';

function App() {
    const [count, setCount] = useState(0);

    const updateCount = () => {
        setCount(count + 1);
    };
    const ref = useRef(updateCount);

    useLayoutEffect(() => {
        ref.current = updateCount;
    });

    useEffect(() => {
        console.log(count);
        const timer = setInterval(() => ref.current(), 1000);

        return () => {
            console.log("销毁");

            clearInterval(timer);
        }
    }, []);

    return <div>{count}</div>;
}

export default App;
