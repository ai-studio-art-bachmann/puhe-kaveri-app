# Camera Panel Component

A reusable camera component for capturing images within a React application. The component is designed to work within a container (not fullscreen) and provides a user-friendly interface for taking photos.

## Features

- 📷 Camera preview within a container
- 🔄 Switch between front and back cameras (when available)
- 🖼️ Capture and return high-quality images
- 🌍 i18n support (FI/EE/EN)
- ♿ Accessible with keyboard navigation and ARIA labels
- 📱 Mobile-first responsive design
- 🛠️ Proper resource cleanup

## Installation

1. Make sure you have the required dependencies in your project:
   - React 16.8+
   - react-i18next
   - Tailwind CSS

2. Copy the `CameraPanel` component and its translation files to your project.

## Usage

```tsx
import { useState } from 'react';
import CameraPanel from './CameraPanel';

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = (blob: Blob) => {
    // Create a URL for the captured image
    const imageUrl = URL.createObjectURL(blob);
    setCapturedImage(imageUrl);
    
    // You can also upload the blob to a server here
    // uploadImage(blob);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camera Example</h1>
      
      <div className="mb-4">
        <CameraPanel onCapture={handleCapture} className="mb-4" />
      </div>
      
      {capturedImage && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Captured Image:</h2>
          <img 
            src={capturedImage} 
            alt="Captured content" 
            className="max-w-full h-auto rounded-lg shadow-md"
          />
        </div>
      )}
    </div>
  );
}

export default App;
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onCapture` | `(blob: Blob) => void` | Yes | Callback function that receives the captured image as a Blob |
| `className` | `string` | No | Additional CSS classes for the container |

## State Machine

The component uses a state machine with the following states:

- `idle`: Initial state, shows the open camera button
- `opening`: Camera is being initialized
- `ready`: Camera is active and ready to capture
- `capturing`: Image is being captured
- `denied`: Camera permission was denied
- `error`: An error occurred

## Accessibility

- All interactive elements have proper ARIA labels
- Status messages are announced via an ARIA live region
- Keyboard navigation is fully supported
- Focus management is handled properly

## Localization

The component includes translations for Finnish (FI), Estonian (ET), and English (EN). To add a new language:

1. Create a new JSON file in the `locales/{lang}/` directory
2. Follow the same structure as the existing translation files
3. The translation keys are used throughout the component

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 11+)
- Chrome for Android

## Known Limitations

- On iOS, the camera may not work in certain browsers due to stricter autoplay policies
- Some older browsers may not support all camera features
- The component does not handle video recording, only still images

## Development

1. Clone the repository
2. Install dependencies with `npm install` or `yarn`
3. Start the development server with `npm run dev` or `yarn dev`
4. The component can be tested in the development environment

## License

MIT
