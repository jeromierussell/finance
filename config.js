module.exports = {
    mongo: {
        development: {
            connectionString: process.env.DEV_MONGODB
        },
        production: {
            connectionString: process.env.PROD_MONGODB
        }
    }
}
