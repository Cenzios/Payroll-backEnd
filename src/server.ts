import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import prisma from './config/db';

const PORT = process.env.PORT || 5000;



const startServer = async (): Promise<void> => {
    try {
        // Check DB connection
        await prisma.$connect();
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
