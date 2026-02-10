import { useState, useEffect } from 'react';
import QRScanner from './components/QRScanner';
import StreamingVoiceInput from './components/StreamingVoiceInput';
import MicrophoneSelector from './components/MicrophoneSelector';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import db from './services/database';
import { processConversation, clearConversation } from './services/agenticClaude';
import './App.css';

function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [claudeStatus, setClaudeStatus] = useState(null); // Show what Claude is thinking
  const [selectedMicDevice, setSelectedMicDevice] = useState(null); // Selected microphone device

  useEffect(() => {
    loadRecentMovements();
    loadAllItems();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const loadRecentMovements = async () => {
    try {
      const movements = await db.getRecentMovements(5);
      setRecentMovements(movements);
    } catch (error) {
      console.error('Error loading movements:', error);
      showToast('Failed to load recent movements', 'error');
    }
  };

  const loadAllItems = async () => {
    try {
      const items = await db.getAllItems();
      setAllItems(items);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleScan = (code) => {
    setScannedCode(code);
    setShowScanner(false);
    showToast(`✅ Scanned: ${code}. Now use voice to add, remove, or move items.`, 'success');
  };

  // AGENTIC HANDLER - Let Claude do the thinking!
  const handleVoiceCommand = async (transcript, currentScannedCode) => {
    console.log('🎯 handleVoiceCommand called with:', transcript);

    if (!transcript.trim()) {
      showToast('No voice input detected. Please try again.', 'warning');
      return;
    }

    setLoading(true);
    setClaudeStatus({ step: 'received', message: `You said: "${transcript}"` });
    showToast(`🎤 Received: "${transcript}"`, 'info');
    console.log('📩 Status: RECEIVED');

    try {
      setClaudeStatus({ step: 'thinking', message: 'Claude is analyzing your request...' });
      console.log('🤔 Status: THINKING');

      // Let Claude process the conversation with full context
      const response = await processConversation(transcript, currentScannedCode || scannedCode, allItems);

      setLoading(false);
      setClaudeStatus({ step: 'responded', message: response.response_message });

      // Show Claude's response message
      if (response.response_message) {
        const toastType = response.needs_confirmation ? 'warning' :
                         response.action === 'CLARIFY' ? 'info' : 'success';
        showToast(response.response_message, toastType);
      }

      // Handle different actions
      if (response.action === 'CLARIFY') {
        // Claude needs more info - just show the message, user can respond
        setClaudeStatus({ step: 'needs_clarification', message: response.response_message });
        return;
      }

      setClaudeStatus({ step: 'executing', message: 'Executing action...' });

      if (response.needs_confirmation) {
        // Claude wants confirmation before executing
        setConfirmDialog({
          message: `${response.response_message}\n\nProceed with this action?`,
          onConfirm: async () => {
            setConfirmDialog(null);
            await executeAction(response);
          },
          onCancel: () => {
            setConfirmDialog(null);
            showToast('Action cancelled', 'info');
          },
          confirmText: 'Yes, do it',
          cancelText: 'Cancel'
        });
        return;
      }

      // Execute action directly if confident
      await executeAction(response);
      setClaudeStatus({ step: 'complete', message: '✅ Action completed successfully!' });

      // Clear status after 3 seconds
      setTimeout(() => setClaudeStatus(null), 3000);

    } catch (error) {
      console.error('Error processing command:', error);
      setLoading(false);
      setClaudeStatus({ step: 'error', message: `Error: ${error.message}` });

      let errorMsg = 'Something went wrong processing your command.';
      if (error.message?.includes('API key')) {
        errorMsg = '❌ API configuration error. Please check your environment variables.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMsg = '❌ Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMsg = `❌ Error: ${error.message}`;
      }

      showToast(errorMsg, 'error');
    }
  };

  // Execute the actual database operations
  const executeAction = async (response) => {
    try {
      if (response.action === 'ADD') {
        await handleAdd(response);
      } else if (response.action === 'REMOVE') {
        await handleRemove(response);
      } else if (response.action === 'MOVE') {
        await handleMove(response);
      } else if (response.action === 'SEARCH') {
        await handleSearch(response);
      }

      await loadRecentMovements();
      await loadAllItems(); // Refresh item list
    } catch (error) {
      showToast(`❌ Failed to execute action: ${error.message}`, 'error');
    }
  };

  const handleAdd = async (parsed) => {
    const locationId = parsed.to_location || scannedCode;

    if (!locationId) {
      showToast('❌ No location specified. Please scan a QR code first.', 'error');
      return;
    }

    try {
      // Ensure location exists before adding items
      await db.ensureLocation(locationId);

      for (const item of parsed.items) {
        const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.addItem(
          itemId,
          item.description,
          'general',
          item.quantity,
          locationId
        );
      }

      const itemsDesc = parsed.items.map(i => `${i.quantity || 1}x ${i.description}`).join(', ');
      showToast(`✅ Added ${itemsDesc} to ${locationId}`, 'success');
    } catch (error) {
      showToast(`❌ Failed to add items: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleRemove = async (parsed) => {
    const locationId = parsed.from_location || scannedCode;

    if (!locationId) {
      showToast('❌ No location specified. Please scan a QR code first.', 'error');
      return;
    }

    try {
      const items = await db.getItemsInLocation(locationId);

      if (items.length === 0) {
        showToast(`⚠️ No items found in ${locationId}`, 'warning');
        return;
      }

      let removedCount = 0;
      for (const parsedItem of parsed.items) {
        const match = items.find(i =>
          i.description.toLowerCase().includes(parsedItem.description.toLowerCase())
        );

        if (match) {
          if (parsedItem.quantity && match.quantity) {
            const newQty = match.quantity - parsedItem.quantity;
            if (newQty > 0) {
              await db.updateQuantity(match.id, newQty);
            } else {
              await db.removeItem(match.id, locationId);
            }
          } else {
            await db.removeItem(match.id, locationId);
          }
          removedCount++;
        }
      }

      if (removedCount > 0) {
        showToast(`✅ Removed ${removedCount} item(s) from ${locationId}`, 'success');
      } else {
        showToast(`⚠️ No matching items found in ${locationId}`, 'warning');
      }
    } catch (error) {
      showToast(`❌ Failed to remove items: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleMove = async (parsed) => {
    const fromLocation = parsed.from_location;
    const toLocation = parsed.to_location;

    if (!fromLocation || !toLocation) {
      showToast('❌ Please specify both source and destination locations', 'error');
      return;
    }

    try {
      // Ensure both locations exist
      await db.ensureLocation(fromLocation);
      await db.ensureLocation(toLocation);

      const items = await db.getItemsInLocation(fromLocation);

      if (items.length === 0) {
        showToast(`⚠️ No items found in ${fromLocation}`, 'warning');
        return;
      }

      let movedCount = 0;
      for (const parsedItem of parsed.items) {
        const match = items.find(i =>
          i.description.toLowerCase().includes(parsedItem.description.toLowerCase())
        );

        if (match) {
          await db.moveItem(match.id, fromLocation, toLocation, parsedItem.quantity);
          movedCount++;
        }
      }

      if (movedCount > 0) {
        showToast(`✅ Moved ${movedCount} item(s) from ${fromLocation} to ${toLocation}`, 'success');
      } else {
        showToast(`⚠️ No matching items found to move`, 'warning');
      }
    } catch (error) {
      showToast(`❌ Failed to move items: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleSearch = async (parsed) => {
    const query = parsed.items[0]?.description || searchQuery;
    setLoading(true);

    try {
      const results = await db.searchItems(query);
      setSearchResults(results);
      if (results.length > 0) {
        showToast(`Found ${results.length} result(s) for "${query}"`, 'success');
      } else {
        showToast(`No results found for "${query}"`, 'warning');
      }
    } catch (error) {
      showToast(`❌ Search error: ${error.message}`, 'error');
    }

    setLoading(false);
  };

  const handleUndo = async () => {
    try {
      const lastMovement = await db.getLastMovement();
      if (!lastMovement) {
        showToast('⚠️ Nothing to undo', 'warning');
        return;
      }

      if (lastMovement.action === 'ADD') {
        await db.removeItem(lastMovement.item_id, lastMovement.to_location_id);
      } else if (lastMovement.action === 'MOVE') {
        await db.moveItem(
          lastMovement.item_id,
          lastMovement.to_location_id,
          lastMovement.from_location_id,
          lastMovement.quantity
        );
      }

      showToast('✅ Undone last action', 'success');
      await loadRecentMovements();
    } catch (error) {
      showToast(`❌ Undo error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="App">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText || 'Confirm'}
          cancelText={confirmDialog.cancelText}
        />
      )}

      <header style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #404040' }}>
        <h1 style={{ fontSize: '1.8em', color: '#ffd700', margin: '0' }}>Dukane Inventory</h1>
      </header>

      <main style={{ padding: '20px 40px', maxWidth: '900px', margin: '0 auto' }}>
        {scannedCode && (
          <div style={{
            padding: '20px',
            backgroundColor: '#2d2d2d',
            border: '1px solid #404040',
            borderRadius: '12px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ color: '#e0e0e0', fontSize: '16px' }}>
              <strong>Scanned Location:</strong> {scannedCode}
            </div>
            <button
              onClick={() => setScannedCode(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#e0e0e0',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* CLAUDE STATUS DISPLAY */}
        {claudeStatus && (
          <div style={{
            padding: '24px',
            backgroundColor: claudeStatus.step === 'error' ? '#3d2a2e' :
                           claudeStatus.step === 'complete' ? '#2a3d2e' :
                           claudeStatus.step === 'needs_clarification' ? '#3d3a2a' :
                           '#2a3a3d',
            border: `1px solid ${claudeStatus.step === 'error' ? '#5d4a4e' :
                                claudeStatus.step === 'complete' ? '#4a5d4e' :
                                claudeStatus.step === 'needs_clarification' ? '#5d5a4a' :
                                '#4a5a5d'}`,
            borderRadius: '12px',
            marginBottom: '40px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: claudeStatus.step === 'error' ? '#ff8a9a' :
                       claudeStatus.step === 'complete' ? '#8aff9a' :
                       claudeStatus.step === 'needs_clarification' ? '#ffd98a' :
                       '#8ad9ff'
              }}>
                {claudeStatus.step === 'received' && 'RECEIVED'}
                {claudeStatus.step === 'thinking' && 'THINKING...'}
                {claudeStatus.step === 'responded' && 'CLAUDE SAYS'}
                {claudeStatus.step === 'executing' && 'EXECUTING...'}
                {claudeStatus.step === 'complete' && 'COMPLETE'}
                {claudeStatus.step === 'needs_clarification' && 'NEEDS CLARIFICATION'}
                {claudeStatus.step === 'error' && 'ERROR'}
              </div>
            </div>
            <div style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#e0e0e0',
              fontWeight: '500'
            }}>
              {claudeStatus.message}
            </div>
          </div>
        )}

        {/* ACTIONS SECTION */}
        <div style={{
          backgroundColor: '#252525',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '50px',
          border: '1px solid #404040'
        }}>
          <h2 style={{
            color: '#ffd700',
            fontSize: '1.3em',
            marginTop: '0',
            marginBottom: '25px',
            fontWeight: '600'
          }}>Actions</h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            <button onClick={() => setShowScanner(true)} style={{ padding: '20px', fontSize: '18px', backgroundColor: '#2d2d2d', color: '#e0e0e0', border: '1px solid #404040', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
              Scan QR Code
            </button>

            <StreamingVoiceInput
              onTranscriptComplete={handleVoiceCommand}
              scannedCode={scannedCode}
              deviceId={selectedMicDevice}
            />

            <button onClick={handleUndo} style={{ padding: '15px', fontSize: '16px', backgroundColor: '#2d2d2d', color: '#e0e0e0', border: '1px solid #404040', borderRadius: '12px', cursor: 'pointer' }}>
              Undo Last
            </button>
          </div>
        </div>

        {/* SEARCH SECTION */}
        <div style={{
          backgroundColor: '#252525',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '50px',
          border: '1px solid #404040'
        }}>
          <h2 style={{
            color: '#ffd700',
            fontSize: '1.3em',
            marginTop: '0',
            marginBottom: '25px',
            fontWeight: '600'
          }}>Search Inventory</h2>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for items..."
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #404040',
              backgroundColor: '#2d2d2d',
              color: '#e0e0e0',
              marginBottom: '15px'
            }}
          />

          <button
            onClick={() => handleSearch({ items: [{ description: searchQuery }] })}
            style={{
              padding: '12px 30px',
              backgroundColor: '#2d2d2d',
              color: '#e0e0e0',
              border: '1px solid #404040',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Search
          </button>

          {searchResults.length > 0 && (
            <div style={{ marginTop: '30px', paddingTop: '30px', borderTop: '1px solid #404040' }}>
              <h3 style={{ color: '#e0e0e0', marginBottom: '20px', fontSize: '1.1em' }}>Results</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                {searchResults.map(item => (
                  <div key={item.id} style={{
                    padding: '18px',
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    color: '#e0e0e0'
                  }}>
                    <strong style={{ fontSize: '16px' }}>{item.description}</strong>
                    {item.quantity && <span style={{ marginLeft: '10px', color: '#b0b0b0' }}>(Qty: {item.quantity})</span>}
                    <br />
                    <small style={{ color: '#b0b0b0', marginTop: '8px', display: 'inline-block' }}>
                      Location: {item.location_description || item.current_location_id}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SETTINGS SECTION */}
        <div style={{
          backgroundColor: '#252525',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '50px',
          border: '1px solid #404040'
        }}>
          <h2 style={{
            color: '#ffd700',
            fontSize: '1.3em',
            marginTop: '0',
            marginBottom: '25px',
            fontWeight: '600'
          }}>Settings</h2>

          <MicrophoneSelector
            onDeviceChange={setSelectedMicDevice}
            isRecording={loading}
          />
        </div>

        {/* RECENT ACTIVITY SECTION */}
        <div style={{
          backgroundColor: '#252525',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '50px',
          border: '1px solid #404040'
        }}>
          <h2 style={{
            color: '#ffd700',
            fontSize: '1.3em',
            marginTop: '0',
            marginBottom: '25px',
            fontWeight: '600'
          }}>Recent Activity</h2>

          {recentMovements.length > 0 ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {recentMovements.map((movement, idx) => (
                <div key={idx} style={{
                  padding: '18px',
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#e0e0e0'
                }}>
                  <strong>{movement.action}:</strong> {movement.item_description || movement.item_id}
                  {movement.from_location_id && ` from ${movement.from_location_id}`}
                  {movement.to_location_id && ` to ${movement.to_location_id}`}
                  <br />
                  <small style={{ color: '#b0b0b0', marginTop: '8px', display: 'inline-block' }}>
                    {new Date(movement.timestamp * 1000).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#b0b0b0', margin: '0' }}>No recent activity</p>
          )}
        </div>
      </main>

      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            padding: '30px 40px',
            backgroundColor: '#2d2d2d',
            border: '1px solid #404040',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #404040',
              borderTop: '5px solid #ffd700',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <div style={{ fontSize: '18px', fontWeight: '500', color: '#e0e0e0' }}>
              Processing...
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
