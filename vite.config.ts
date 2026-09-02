import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'/taskora/',plugins:[react()],server:{port:5173}});
