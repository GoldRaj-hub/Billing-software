import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Store, Mail, Lock, User, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, signIn, resetPassword, loading, error } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  // Automatically redirect user if already authenticated
  useEffect(() => {
    if (user && profile) {
      const role = profile.role || 'Cashier';
      if (role === 'Cashier') {
        navigate('/billing');
      } else {
        navigate('/');
      }
    }
  }, [user, profile, navigate]);


  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Cashier');
  
  // Custom message triggers
  const [infoMsg, setInfoMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setInfoMsg('');
    
    if (!email || !password) {
      setErrMsg('Please enter both email and password.');
      return;
    }

    const res = await signIn(email, password);
    if (!res.success) {
      setErrMsg(res.error || 'Invalid credentials');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setInfoMsg('');

    if (!email) {
      setErrMsg('Please enter your email address.');
      return;
    }

    const res = await resetPassword(email);
    if (res.success) {
      setInfoMsg('Password reset link sent! Check your inbox.');
    } else {
      setErrMsg(res.error || 'Failed to send recovery email.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setInfoMsg('');

    if (!email || !password || !name) {
      setErrMsg('Please fill out all fields.');
      return;
    }

    try {
      // Register with custom user metadata (triggers handle_new_user database trigger)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });

      if (signUpError) throw signUpError;
      
      setInfoMsg('Account registered successfully! You can now log in.');
      setIsRegister(false);
      setPassword('');
    } catch (err) {
      setErrMsg(err.message || 'Registration failed.');
    }
  };

  // Styles
  const wrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    background: 'radial-gradient(circle at top right, var(--primary-light), var(--bg-app))',
    padding: '20px'
  };

  const cardStyle = {
    maxWidth: '460px',
    width: '100%',
    padding: '40px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)'
  };

  const logoIconBg = {
    background: 'var(--primary)',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    boxShadow: '0 8px 24px rgba(114, 52, 237, 0.3)'
  };

  return (
    <div style={wrapperStyle}>
      <div className="glass-panel" style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={logoIconBg}>
            <Store size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
            {isForgot ? 'Reset Password' : isRegister ? 'Staff Registration' : 'Retail Genius POS'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isForgot 
              ? 'Enter email to receive password reset links' 
              : isRegister 
                ? 'Create a new cashier, manager, or admin credential' 
                : 'Sign in to access your retail billing portal'}
          </p>
        </div>

        {/* Display Alert Messages */}
        {(errMsg || error) && (
          <div className="glass-panel" style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} />
            <span>{errMsg || error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="glass-panel" style={{
            background: 'var(--success-light)',
            color: 'var(--success)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Authentication forms */}
        {isForgot ? (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@store.com" 
                  className="input-field" 
                  style={{ paddingLeft: '44px' }} 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Sending link...' : 'Send Recovery Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem' }}>
              <button type="button" onClick={() => setIsForgot(false)} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Back to Sign In
              </button>
            </div>
          </form>
        ) : isRegister ? (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" 
                  className="input-field" 
                  style={{ paddingLeft: '44px' }} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cashier@store.com" 
                  className="input-field" 
                  style={{ paddingLeft: '44px' }} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="input-field" 
                  style={{ paddingLeft: '44px' }} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">System Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="input-field"
              >
                <option value="Cashier">Cashier (Billing POS only)</option>
                <option value="Manager">Manager (Billing + Stock + Dashboard)</option>
                <option value="Admin">Admin (Full System Controls)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Register Staff Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <button type="button" onClick={() => setIsRegister(false)} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@store.com" 
                  className="input-field" 
                  style={{ paddingLeft: '44px' }} 
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="input-field" 
                  style={{ paddingLeft: '44px' }} 
                  required 
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <button type="button" onClick={() => setIsForgot(true)} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Checking credentials...' : 'Secure Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Add new staff credentials?{' '}
              <button type="button" onClick={() => setIsRegister(true)} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Register Staff
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
