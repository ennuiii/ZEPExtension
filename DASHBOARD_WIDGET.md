# ZEP Dashboard Widget

## Überblick

Das ZEP Dashboard Widget ermöglicht es Projektleitern und PMs, ZEP-Zeiten für mehrere Work Items gleichzeitig zu aktualisieren. Das Widget kann in Azure DevOps Dashboards integriert werden und nutzt Queries, um Work Items zu identifizieren und deren Zeitdaten zu aktualisieren.

## Features

### Widget-Konfiguration
- **Titel**: Anpassbarer Widget-Titel für das Dashboard
- **Query-Auswahl**: Dropdown mit allen verfügbaren DevOps-Queries
- **Button-Beschriftung**: Anpassbarer Text für den Action-Button  
- **Button-Farbe**: Auswahl aus vordefinierten Farben oder benutzerdefinierte Hex-Farben
- **Live-Vorschau**: Zeigt das Widget-Aussehen während der Konfiguration

### Funktionsweise
1. **Query-Ausführung**: Das Widget führt die konfigurierte Query aus
2. **Work Item Filterung**: Nur Work Items mit `Custom.ZEPNummer` Feld werden verarbeitet
3. **ZEP API Aufrufe**: Für jede ZEP-Nummer werden Plan- und Ist-Zeiten abgerufen
4. **Feldaktualisierung**: Die Felder `Custom.Plan` und `Custom.Ist` werden automatisch aktualisiert
5. **Fortschrittsanzeige**: Live-Fortschritt mit Statistiken

### Unterstützte Felder
- **Custom.ZEPNummer**: Eingabefeld (Komma- oder Semikolon-getrennte ZEP-Ticket-IDs)
- **Custom.Plan**: Ausgabefeld (Summe der geplanten Stunden)
- **Custom.Ist**: Ausgabefeld (Summe der erfassten Stunden)

## Installation und Verwendung

### 1. Widget hinzufügen
1. Gehen Sie zu einem Azure DevOps Dashboard
2. Klicken Sie auf "Widget hinzufügen"
3. Suchen Sie nach "ZEP Time Batch Update"
4. Fügen Sie das Widget hinzu

### 2. Widget konfigurieren
1. Klicken Sie auf das Zahnrad-Symbol des Widgets
2. Konfigurieren Sie:
   - **Widget-Titel**: z.B. "Sprint 1 Zeiten"
   - **Query**: Wählen Sie eine Query aus, die Work Items mit ZEP-Nummern enthält
   - **Button-Text**: z.B. "Zeiten synchronisieren"
   - **Button-Farbe**: Wählen Sie eine passende Farbe
3. Speichern Sie die Konfiguration

### 3. Zeiten aktualisieren
1. Klicken Sie auf den konfigurierten Button im Widget
2. Das Widget zeigt den Fortschritt der Verarbeitung an
3. Statistiken zeigen verarbeitete und aktualisierte Work Items
4. Nach Abschluss erhalten Sie eine Erfolgsmeldung

## Widget-Größen

Das Widget unterstützt verschiedene Größen:
- **2x2**: Kompakte Ansicht
- **2x3**: Standard-Ansicht  
- **3x2**: Erweiterte Ansicht

## Fehlerbehandlung

### Häufige Probleme
- **"Keine Query konfiguriert"**: Widget muss erst konfiguriert werden
- **"Keine Work Items gefunden"**: Query enthält keine Work Items mit Custom.ZEPNummer
- **"Failed to fetch"**: CORS-Probleme mit der ZEP API (siehe Proxy-Server)

### Debugging
- Console-Logs zeigen detaillierte Informationen über jeden Schritt
- Work Items ohne gültige ZEP-Nummern werden übersprungen
- API-Fehler werden einzeln behandelt und stoppen nicht den gesamten Prozess

## API-Endpunkte

Das Widget nutzt dieselben Proxy-Endpunkte wie die Work Item Extension:
- **Tickets**: `https://zepextension.onrender.com/api/zep/tickets/{id}`
- **Time Entries**: `https://zepextension.onrender.com/api/zep/attendances?ticket_id={id}`

## Technische Details

### Architektur
- **Widget**: `src/dashboard-widget/dashboard-widget.html`
- **Konfiguration**: `src/dashboard-widget/configuration.html`
- **SDK**: Azure DevOps Extension SDK
- **API**: Work Item Tracking REST API für Feldaktualisierungen

### Abhängigkeiten
- Azure DevOps Extension SDK
- Work Item Tracking Service
- Proxy Server für ZEP API Zugriff

### Berechtigungen
- `vso.work_write`: Zum Aktualisieren von Work Item Feldern
- `vso.dashboards`: Für Dashboard-Widget-Funktionalität

## Beispiel-Workflow

1. **Vorbereitung**: Erstellen Sie eine Query, die Work Items mit Custom.ZEPNummer enthält
2. **Widget-Setup**: Fügen Sie das Widget zum Dashboard hinzu und konfigurieren Sie es
3. **Regelmäßige Updates**: Verwenden Sie das Widget, um Zeiten periodisch zu aktualisieren
4. **Monitoring**: Überwachen Sie die Statistiken und Erfolgsmeldungen

## V1-Einschränkungen

- Keine parallelen API-Aufrufe (sequenzielle Verarbeitung)
- Keine erweiterte Fortschrittsanzeige für einzelne Tickets
- Kein Logging in Dateien
- Nur erste Seite der Time Entries (100 Einträge pro Ticket)

## Roadmap V2

- Parallele API-Aufrufe für bessere Performance
- Erweiterte Fehlerbehandlung und Retry-Mechanismen
- Detailliertes Logging und Export-Funktionen
- Unterstützung für Paginierung bei großen Datasets
- Dashboard-Refresh nach Update-Abschluss 