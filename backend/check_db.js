const mysql = require('mysql2/promise');

async function checkDatabase() {
  try {
    // Connect without specifying database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('🔍 Available databases:');
    const [databases] = await connection.query('SHOW DATABASES');
    databases.forEach(db => {
      console.log(`- ${db.Database}`);
    });

    // Try to find our ERP database
    const erpDatabases = databases.filter(db => 
      db.Database.toLowerCase().includes('erp') || 
      db.Database.toLowerCase().includes('system')
    );

    if (erpDatabases.length > 0) {
      console.log('\n🎯 Potential ERP databases:');
      erpDatabases.forEach(db => console.log(`- ${db.Database}`));
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase(); 