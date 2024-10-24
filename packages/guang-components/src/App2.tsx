import dayjs from 'dayjs';
import {Calendar} from './index';


function App() {
  return (
    <div>
      <Calendar value={dayjs('2024-07-01')}></Calendar>
    </div>
  );
}

export default App;
