import { useEffect, useState } from 'react';

function App() {

    const [count,setCount] = useState(0);

    useEffect(() => {
        console.log(count);

        const timer = setInterval(() => {
            setCount(count + 1);
        }, 1000);

        return () => {
            console.log('销毁');
            clearInterval(timer);
        }
    }, [count]);

    return <div>{count}</div>
}

export default App;
