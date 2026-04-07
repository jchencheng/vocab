module.exports = async function handler(req, res) {
  try {
    console.log('Test API received request');
    res.status(200).json({ message: 'Test API works!' });
  } catch (error) {
    console.error('Error in test API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}