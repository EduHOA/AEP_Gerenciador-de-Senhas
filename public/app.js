document.addEventListener("DOMContentLoaded", function () {
    const loading = document.getElementById('loading');
    loading.style.display = 'none'; 
});

document.addEventListener("DOMContentLoaded", function () {
    const usernameDisplay = document.getElementById('username-display');
    const username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = `Bem-vindo, ${username}!`;
    } else {
        usernameDisplay.textContent = 'Usuário não identificado';
    }
});

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    

    const loading = document.getElementById('loading');
    loading.style.display = 'none'; 

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('username', username);

        loading.style.display = 'block'; 

        setTimeout(() => {
          localStorage.setItem('token', data.token);
          window.location.href = '/home.html';
        }, 2000); 
      } else {
        alert(data.message || 'Erro no login');
        loading.style.display = 'none'; 
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro no servidor, tente novamente mais tarde.');
    } finally {
        setTimeout(() => {
          loading.style.display = 'none';
        }, 2100); 
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    const successCard = document.querySelector('.success-card');
    const loadingText = document.querySelector('.loading-text');

    document.getElementById('register-password').addEventListener('input', function(event) {
      this.value = this.value.replace(/\s/g, '');
  });

  document.querySelector('form').addEventListener('submit', function(event) {
      const password = document.getElementById('register-password').value;
      if (/\s/.test(password)) {
          event.preventDefault();  // Impede o envio do formulário
          alert('A senha não pode conter espaços.');
      }
  });

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        successCard.style.display = 'block';
        loadingText.style.display = 'block';

          setTimeout(() => {
            successCard.classList.add('fade-out');

            setTimeout(() => {
              successCard.style.display = 'none';
              successCard.classList.remove('fade-out');
              window.location.href = 'index.html';
            }, 500);
          }, 3500);
      } else {
        successCard.style.display = 'none';
        alert(data.message || 'Erro no registro');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro no servidor, tente novamente mais tarde.');
    }
  });
}

const passwordForm = document.getElementById('password-form');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const url = document.getElementById('url').value;
    const password = document.getElementById('site-password').value;

    try {
      const token = localStorage.getItem('token'); 
      const response = await fetch('/add-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Senha salva com sucesso!');
        loadPasswords();
      } else {
        alert(data.message || 'Erro ao salvar senha');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro no servidor, tente novamente mais tarde.');
    }
  });
}

async function loadPasswords() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/get-passwords', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const passwords = await response.json();
    const passwordList = document.getElementById('passwords-list');
    passwordList.innerHTML = ''; 

    passwords.forEach(password => {
        const passwordItem = document.createElement('div');
        passwordItem.innerHTML = `
          <div class="text-center"><strong>URL:</strong> ${password.url}</div> 
          <button class="view-password btn btn-primary" data-id="${password._id}">Ver Senha</button>
          <button class="delete-password btn btn-primary" data-id="${password._id}">Excluir</button>
        `;
        passwordList.appendChild(passwordItem);
      });
      
    const viewButtons = document.querySelectorAll('.view-password');
    viewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const passwordId = e.target.getAttribute('data-id');
        showPasswordModal(passwordId);
      });
    });
  } catch (error) {
    console.error('Erro ao carregar senhas:', error);
  }

    const deleteButtons = document.querySelectorAll('.delete-password');
    deleteButtons.forEach(button => {
     button.addEventListener('click', (e) => {
        const passwordId = e.target.getAttribute('data-id');
        deletePassword(passwordId);
       });
    });
}

function showPasswordModal(passwordId) {
    const modal = document.getElementById('view-password-modal');
    modal.style.display = 'block';

    const confirmButton = document.getElementById('confirm-view-password');
    confirmButton.onclick = async () => {
        const verifyPassword = document.getElementById('verify-password').value;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/verify-password/${passwordId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: verifyPassword }),
            });

            const data = await response.json();
            if (response.ok) {
                document.getElementById('encrypted-password-display').innerText = `Senha Descriptografada: ${data.decryptedPassword}`;
            } else {
                alert(data.message || 'Senha incorreta');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro no servidor, tente novamente mais tarde.');
        }
    };

    const cancelButton = document.getElementById('cancel-view-password');
    cancelButton.onclick = () => {
        modal.style.display = 'none';
        document.getElementById('verify-password').value = '';
        document.getElementById('encrypted-password-display').innerText = '';
    };

    const closeButton = document.querySelector('.close');
    closeButton.onclick = () => {
        modal.style.display = 'none';
        document.getElementById('verify-password').value = '';
        document.getElementById('encrypted-password-display').innerText = '';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.getElementById('verify-password').value = '';
            document.getElementById('encrypted-password-display').innerText = '';
        }
    };
}

async function deletePassword(passwordId) {
    if (!confirm('Você tem certeza que deseja excluir esta senha?')) return;
  
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/delete-password/${passwordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert('Senha excluída com sucesso!');
        loadPasswords(); 
      } else {
        alert(data.message || 'Erro ao excluir a senha');
      }
    } catch (error) {
      console.error('Erro ao excluir senha:', error);
      alert('Erro no servidor, tente novamente mais tarde.');
    }
  }
  
if (window.location.pathname === '/home.html') {
  loadPasswords();
}
