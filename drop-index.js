/**
 * Script to drop the problematic publicProfileUsername index
 * Run with: node drop-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const environment = process.env.NODE_ENV || 'development';
const MONGODB_URI = environment === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;

async function dropIndex() {
	try {
		console.log('🔌 Connecting to MongoDB...');
		await mongoose.connect(MONGODB_URI);

		console.log('✅ Connected to database');
		console.log('🗑️  Dropping publicProfileUsername_1 index...');

		const db = mongoose.connection.db;
		await db.collection('users').dropIndex('publicProfileUsername_1');

		console.log('✅ Index dropped successfully!');
		console.log('📝 The index will be recreated as sparse when you restart the app');
	} catch (error) {
		if (error.code === 27 || error.codeName === 'IndexNotFound') {
			console.log('ℹ️  Index does not exist or already dropped');
		} else {
			console.error('❌ Error:', error.message);
		}
	} finally {
		await mongoose.disconnect();
		console.log('👋 Disconnected from database');
		process.exit(0);
	}
}

dropIndex();
