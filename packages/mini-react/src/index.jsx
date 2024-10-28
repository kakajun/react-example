const { render, useState, useEffect } = window.MiniReact;
function Counter(props) {
  const {
    initialNum,
    interval
  } = props;
  const [count, setCount] = useState(initialNum)
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //       setCount((count)=> count + 1)
  //   }, interval);
  //   return () => clearTimeout(timer);
  // }, []);
  const clickChange= ()=>{
    setCount(count+1)
  }
  return <div>
    <p onClick={clickChange}>{count}</p>
  </div>;
}
function App() {
  return <Counter  interval={1000} initialNum={10}></Counter>
}

render(<App/>, document.getElementById('root'));
