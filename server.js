const express = require('express'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');

dotenv.config();  

const app = express();  

app.use(express.static('public')); 
app.use(express.json());  
app.use(cors());  

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch((error) => console.error('Erro ao conectar ao MongoDB:', error));

const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}));

const Password = mongoose.model('Password', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  url: { type: String, required: true },
  encryptedPassword: { type: String, required: true },
}));

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuário registrado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor, tente novamente mais tarde.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Senha incorreta' }) ;

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; 
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

app.post('/add-password', authMiddleware, async (req, res) => {
    const { url, password } = req.body;
  
    //essa parte peguei no chat que negócio de louco
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.randomBytes(32); // Chave de 32 bytes
      const iv = crypto.randomBytes(16); // Vetor de inicialização
  
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
  
      const newPassword = new Password({
        userId: req.userId,
        url,
        encryptedPassword: `${iv.toString('hex')}:${encrypted}:${key.toString('hex')}`, 
      });
      await newPassword.save();
  
      res.status(201).json({ message: 'Senha salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar senha:', error);
      res.status(500).json({ message: 'Erro no servidor ao salvar a senha' });
    }
  });
  
app.get('/get-passwords', authMiddleware, async (req, res) => {
  try {
    const passwords = await Password.find({ userId: req.userId });
    res.json(passwords);
  } catch (error) {
    console.error('Erro ao obter senhas:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar as senhas' });
  }
});

app.post('/verify-password/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
  
    try {
      const passwordEntry = await Password.findById(id).populate('userId');
  
      if (!passwordEntry) {
        return res.status(404).json({ message: 'Senha não encontrada' });
      }
  
      const user = await User.findById(passwordEntry.userId._id);
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res.status(400).json({ message: 'Senha incorreta' });
      }

      //peguei a criptografia que o chat definiu e defini tambem como descriptografia
      const [iv, encrypted, key] = passwordEntry.encryptedPassword.split(':');
      const algorithm = 'aes-256-cbc';
  
      const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
  
      res.json({ decryptedPassword: decrypted });
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      res.status(500).json({ message: 'Erro no servidor ao verificar a senha' });
    }
  });
  
app.delete('/delete-password/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
  
    try {
      const passwordEntry = await Password.findByIdAndDelete(id);
  
      if (!passwordEntry) {
        return res.status(404).json({ message: 'Senha não encontrada' });
      }
  
      res.json({ message: 'Senha excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir senha:', error);
      res.status(500).json({ message: 'Erro no servidor ao excluir a senha' });
    }
  });
  
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
