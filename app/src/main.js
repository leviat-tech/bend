import { createApp } from 'vue'
import Concrete from '@crhio/concrete';
import './style.css'
import App from './App.vue'


const app = createApp(App)
app.use(Concrete);
app.mount('#app');
