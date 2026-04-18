import { useState, useRef } from 'react';
import { authService, userService } from '../services/api';

function Dialog({ title, message, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} autoFocus>OK</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteDialog({ userEmail, onConfirm, onClose }) {
  var [typed, setTyped] = useState('');
  var match = typed === userEmail;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: 'var(--danger)' }}>
            Supprimer le compte
          </span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            Cette action est <strong>irréversible</strong>. Tous vos fichiers, dossiers et données
            seront supprimés définitivement.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Tapez <strong>{userEmail}</strong> pour confirmer :
          </p>
          <input
            className="form-input"
            type="text"
            placeholder={userEmail}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={!match}>
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}

var Section = ({ title, danger, children }) => (
  <div style={{
    background:   'var(--bg-primary)',
    border:       '1px solid ' + (danger ? 'var(--danger)' : 'var(--border)'),
    borderRadius: 'var(--radius-lg)',
    padding:      '20px 24px',
    boxShadow:    'var(--shadow-sm)',
    marginBottom: 16,
  }}>
    <div style={{
      fontSize:      11,
      fontWeight:    700,
      color:         danger ? 'var(--danger)' : 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      marginBottom:  18,
    }}>
      {title}
    </div>
    {children}
  </div>
);

var Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{
      display:      'block',
      fontSize:     13,
      color:        'var(--text-secondary)',
      fontWeight:   500,
      marginBottom: 6,
    }}>
      {label}
    </label>
    {children}
    {hint && (
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>
    )}
  </div>
);

export default function Settings({ theme, toggleTheme }) {
  var user = authService.getCurrentUser();

  var [dialog,     setDialog]     = useState(null);
  var [showDelete, setShowDelete] = useState(false);

  var [avatar,     setAvatar]     = useState(null);
  var [avatarFile, setAvatarFile] = useState(null);
  var [uploading,  setUploading]  = useState(false);
  var fileRef = useRef();

  var [emailForm,    setEmailForm]    = useState({ email: '', password: '' });
  var [emailLoading, setEmailLoading] = useState(false);

  var [pwdForm,    setPwdForm]    = useState({ current: '', next: '', confirm: '' });
  var [pwdLoading, setPwdLoading] = useState(false);

  var [deleteLoading, setDeleteLoading] = useState(false);

  var notify = (title, message) => setDialog({ title, message });

  var pwdLen      = pwdForm.next.length;
  var pwdTooShort = pwdLen > 0 && pwdLen < 10;
  var pwdOk       = pwdLen >= 10;
  var pwdMatch    = pwdOk && pwdForm.confirm && pwdForm.next === pwdForm.confirm;
  var pwdMismatch = pwdForm.confirm.length > 0 && pwdForm.next !== pwdForm.confirm;

  // --- Avatar ---

  var onAvatarPick = (e) => {
    var file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Format invalide', 'Choisissez une image JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Fichier trop lourd', "L'avatar ne doit pas dépasser 5 Mo.");
      return;
    }

    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file));
  };

  var uploadAvatar = async () => {
    if (!avatarFile) return;
    setUploading(true);
    try {
      await userService.uploadAvatar(avatarFile);
      notify('Avatar mis à jour', 'Votre photo de profil a bien été enregistrée.');
      setAvatarFile(null);
    } catch (e) {
      notify('Erreur', e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  };

  // --- Email ---

  var changeEmail = async () => {
    if (!emailForm.email.includes('@')) {
      notify('Email invalide', 'Saisissez une adresse email valide.');
      return;
    }
    if (!emailForm.password) {
      notify('Mot de passe requis', 'Confirmez votre mot de passe actuel.');
      return;
    }

    setEmailLoading(true);
    try {
      await userService.updateEmail(emailForm.email, emailForm.password);
      localStorage.setItem('user', JSON.stringify({ ...user, email: emailForm.email }));
      notify('Email modifié', 'Votre adresse email a bien été mise à jour.');
      setEmailForm({ email: '', password: '' });
    } catch (e) {
      if (e.response?.status === 401) {
        notify('Mot de passe incorrect', 'Le mot de passe saisi est incorrect.');
      } else {
        notify('Erreur', e.response?.data?.error || e.message);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // --- Mot de passe ---

  var changePassword = async () => {
    if (pwdTooShort || !pwdOk) {
      notify('Mot de passe trop court', 'Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    if (pwdMismatch || !pwdMatch) {
      notify('Mots de passe différents', 'La confirmation ne correspond pas.');
      return;
    }
    if (!pwdForm.current) {
      notify('Mot de passe requis', 'Saisissez votre mot de passe actuel.');
      return;
    }

    setPwdLoading(true);
    try {
      await userService.updatePassword(pwdForm.next, pwdForm.current);
      notify('Mot de passe modifié', 'Votre mot de passe a bien été mis à jour.');
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      notify('Erreur', e.response?.data?.error || e.message);
    } finally {
      setPwdLoading(false);
    }
  };

  // --- Suppression du compte ---

  var deleteAccount = async () => {
    setShowDelete(false);
    setDeleteLoading(true);
    try {
      await userService.deleteAccount();
      authService.logout();
      window.location.href = '/login';
    } catch (e) {
      notify('Erreur', e.response?.data?.error || e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {dialog     && <Dialog title={dialog.title} message={dialog.message} onClose={() => setDialog(null)} />}
      {showDelete && (
        <ConfirmDeleteDialog
          userEmail={user?.email}
          onConfirm={deleteAccount}
          onClose={() => setShowDelete(false)}
        />
      )}

      <div className="topbar">
        <span className="topbar-title">Paramètres</span>
      </div>

      <div className="page-content" style={{ overflowY: 'auto' }}>
        <div style={{ maxWidth: 540 }}>

          {/* Photo de profil */}
          <Section title="Photo de profil">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                onClick={() => fileRef.current.click()}
                title="Changer l'avatar"
                style={{
                  width:          72,
                  height:         72,
                  borderRadius:   '50%',
                  background:     'var(--bg-tertiary)',
                  border:         '2px solid var(--border)',
                  overflow:       'hidden',
                  flexShrink:     0,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                }}
              >
                {avatar ? (
                  <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                )}
              </div>

              <div>
                <button
                  className="btn btn-secondary"
                  style={{ marginBottom: 6 }}
                  onClick={() => fileRef.current.click()}
                >
                  Choisir une image
                </button>

                {avatarFile && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{avatarFile.name}</span>
                    <button
                      className="btn btn-primary"
                      style={{ height: 28, fontSize: 12 }}
                      onClick={uploadAvatar}
                      disabled={uploading}
                    >
                      {uploading ? 'Envoi…' : 'Enregistrer'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ height: 28, fontSize: 12 }}
                      onClick={() => {
                        setAvatar(null);
                        setAvatarFile(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div style={{
                  fontSize:   12,
                  color:      'var(--text-tertiary)',
                  marginTop:  avatarFile ? 0 : 4,
                }}>
                  JPG, PNG ou WebP — max 5 Mo
                </div>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onAvatarPick}
            />
          </Section>

          {/* Thème clair / sombre */}
          <Section title="Apparence">
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                {
                  val: 'light',
                  label: 'Clair',
                  icon: (
                    <>
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                    </>
                  ),
                },
                {
                  val: 'dark',
                  label: 'Sombre',
                  icon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>,
                },
              ].map(function(item) {
                var active = theme === item.val;
                return (
                  <button
                    key={item.val}
                    onClick={() => !active && toggleTheme()}
                    style={{
                      flex:           1,
                      padding:        '10px 0',
                      borderRadius:   'var(--radius-md)',
                      border:         '2px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background:     active ? 'var(--accent-light)' : 'var(--bg-secondary)',
                      color:          active ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight:     active ? 600 : 400,
                      fontSize:       13,
                      cursor:         active ? 'default' : 'pointer',
                      transition:     'all 150ms',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      gap:            8,
                      fontFamily:     'inherit',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {item.icon}
                    </svg>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Changer d'email */}
          <Section title="Changer l'adresse email">
            <Field label="Nouvelle adresse email">
              <input
                className="form-input"
                type="email"
                placeholder="nouvelle@email.com"
                value={emailForm.email}
                onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label="Mot de passe actuel (confirmation)">
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={emailForm.password}
                onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
              />
            </Field>
            <button
              className="btn btn-primary"
              onClick={changeEmail}
              disabled={emailLoading || !emailForm.email || !emailForm.password}
            >
              {emailLoading ? 'Vérification…' : 'Mettre à jour'}
            </button>
          </Section>

          {/* Changer le mot de passe */}
          <Section title="Changer le mot de passe">
            <Field label="Mot de passe actuel">
              <input
                className="form-input"
                type="password"
                placeholder="••••••••••"
                value={pwdForm.current}
                onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <input
                className="form-input"
                type="password"
                placeholder="••••••••••"
                value={pwdForm.next}
                onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))}
                style={{
                  borderColor: pwdTooShort ? 'var(--danger)' : (pwdOk ? 'var(--success)' : undefined),
                }}
              />
              {pwdTooShort && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                  {10 - pwdLen} caractère{(10 - pwdLen > 1) ? 's' : ''} manquant{(10 - pwdLen > 1) ? 's' : ''}
                </div>
              )}
              {pwdOk && !pwdTooShort && (
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                  ✓ Longueur correcte
                </div>
              )}
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input
                className="form-input"
                type="password"
                placeholder="••••••••••"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                style={{
                  borderColor: pwdMismatch ? 'var(--danger)' : (pwdMatch ? 'var(--success)' : undefined),
                }}
              />
              {pwdMismatch && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                  Les mots de passe ne correspondent pas
                </div>
              )}
              {pwdMatch && (
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>✓ Correspond</div>
              )}
            </Field>
            <button
              className="btn btn-primary"
              onClick={changePassword}
              disabled={pwdLoading || !pwdOk || !pwdMatch || !pwdForm.current}
            >
              {pwdLoading ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </Section>

          {/* Suppression du compte */}
          <Section title="Zone de danger" danger>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              La suppression de votre compte est <strong>irréversible</strong>. Tous vos fichiers,
              dossiers et partages seront effacés définitivement.
            </p>
            <button
              className="btn btn-danger"
              onClick={() => setShowDelete(true)}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Suppression…' : 'Supprimer mon compte'}
            </button>
          </Section>

        </div>
      </div>
    </div>
  );
}