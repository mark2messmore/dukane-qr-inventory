import { useState, useEffect } from 'react';
import QRScanner from './components/QRScanner';
import VoiceInput from './components/VoiceInput';
import db from './services/database';
import { parseCommand, searchWithClaude } from './services/claude';
import './App.css';

function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentMovements();
  }, []);

  const loadRecentMovements = async () => {
    try {
      const movements = await db.getRecentMovements(5);
      setRecentMovements(movements);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const handleScan = (code) => {
    setScannedCode(code);
    setShowScanner(false);
    setMessage(`Scanned: ${code}. Now say what you want to do with it.`);
  };

  const handleVoiceCommand = async (transcript) => {
    if (!transcript.trim()) return;

    setLoading(true);
    setMessage(`Processing: "${transcript}"`);

    try {
      const parsed = await parseCommand(transcript, scannedCode);

      if (parsed.clarification_needed) {
        setMessage(parsed.clarification_needed);
        setLoading(false);
        return;
      }

      // Handle different actions
      if (parsed.action === 'ADD') {
        await handleAdd(parsed);
      } else if (parsed.action === 'REMOVE') {
        await handleRemove(parsed);
      } else if (parsed.action === 'MOVE') {
        await handleMove(parsed);
      } else if (parsed.action === 'SEARCH') {
        await handleSearch(parsed);
      }

      await loadRecentMovements();
      setScannedCode(null);
      setLoading(false);
    } catch (error) {
      console.error('Error processing command:', error);
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleAdd = async (parsed) => {
    const locationId = parsed.to_location || scannedCode;

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

    setMessage(`✅ Added ${parsed.items.length} item(s) to ${locationId}`);
  };

  const handleRemove = async (parsed) => {
    const locationId = parsed.from_location || scannedCode;
    const items = await db.getItemsInLocation(locationId);

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
      }
    }

    setMessage(`✅ Removed item(s) from ${locationId}`);
  };

  const handleMove = async (parsed) => {
    const fromLocation = parsed.from_location;
    const toLocation = parsed.to_location;
    const items = await db.getItemsInLocation(fromLocation);

    for (const parsedItem of parsed.items) {
      const match = items.find(i =>
        i.description.toLowerCase().includes(parsedItem.description.toLowerCase())
      );

      if (match) {
        await db.moveItem(match.id, fromLocation, toLocation, parsedItem.quantity);
      }
    }

    setMessage(`✅ Moved item(s) from ${fromLocation} to ${toLocation}`);
  };

  const handleSearch = async (parsed) => {
    const query = parsed.items[0]?.description || searchQuery;
    setLoading(true);

    try {
      const results = await db.searchItems(query);
      setSearchResults(results);
      setMessage(`Found ${results.length} result(s) for "${query}"`);
    } catch (error) {
      setMessage(`Search error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleUndo = async () => {
    try {
      const lastMovement = await db.getLastMovement();
      if (!lastMovement) {
        setMessage('Nothing to undo');
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

      setMessage('✅ Undone');
      await loadRecentMovements();
    } catch (error) {
      setMessage(`Undo error: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>🏭 Dukane Inventory</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {scannedCode && (
          <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Scanned:</strong> {scannedCode}
          </div>
        )}

        {message && (
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
          <button onClick={() => setShowScanner(true)} style={{ padding: '20px', fontSize: '18px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
            📷 Scan QR Code
          </button>

          <VoiceInput onTranscript={handleVoiceCommand} />

          <button onClick={handleUndo} style={{ padding: '15px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            ↩️ Undo Last
          </button>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3>Search Inventory</h3>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for items..." style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button onClick={() => handleSearch({ items: [{ description: searchQuery }] })} style={{ marginTop: '10px', padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Search
          </button>

          {searchResults.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4>Results:</h4>
              {searchResults.map(item => (
                <div key={item.id} style={{ padding: '12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
                  <strong>{item.description}</strong>
                  {item.quantity && <span> (Qty: {item.quantity})</span>}
                  <br />
                  <small>Location: {item.location_description || item.current_location_id}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3>Recent Activity</h3>
          {recentMovements.map((movement, idx) => (
            <div key={idx} style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '8px', fontSize: '14px' }}>
              <strong>{movement.action}:</strong> {movement.item_description || movement.item_id}
              {movement.from_location_id && ` from ${movement.from_location_id}`}
              {movement.to_location_id && ` to ${movement.to_location_id}`}
              <br />
              <small>{new Date(movement.timestamp * 1000).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </main>

      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          Processing...
        </div>
      )}
    </div>
  );
}

export default App;
