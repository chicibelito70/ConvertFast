FROM node:20-slim

# Install system dependencies
# Added pandoc for EPUB and other document formats
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    default-jre-headless \
    ffmpeg \
    p7zip-full \
    curl \
    python3 \
    python3-pip \
    poppler-utils \
    pandoc \
    && rm -rf /var/lib/apt/lists/*

# Install pdf2docx (Python tool)
RUN pip3 install pdf2docx --break-system-packages

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Create uploads and outputs directories
RUN mkdir -p uploads outputs

EXPOSE 4000

# Start the application
CMD ["node", "dist/index.js"]
