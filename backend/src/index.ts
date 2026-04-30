import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import uploadRoutes from './routes/uploadRoutes';
import conversionRoutes from './routes/conversionRoutes';
import './workers/conversion.worker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Static folders for downloads
app.use('/downloads', express.static(path.join(__dirname, 'outputs')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/convert', conversionRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ConvertFast API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
