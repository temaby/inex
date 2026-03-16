# Build stage - needs both .NET SDK and Node.js
# Node.js is required because dotnet publish triggers the PublishRunWebpack MSBuild target
# which runs "npm install && npm run build" to produce the React SPA bundle.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Install Node.js 18 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Restore .NET dependencies (cached until any .csproj changes)
COPY inex.sln ./
COPY inex/inex.csproj ./inex/
COPY inex.Services/inex.Services.csproj ./inex.Services/
COPY inex.Data/inex.Data.csproj ./inex.Data/
RUN dotnet restore

# Pre-install npm dependencies (cached until package.json / package-lock.json changes)
COPY inex/ClientApp/package.json inex/ClientApp/package-lock.json ./inex/ClientApp/
RUN cd inex/ClientApp && npm ci --silent

# Copy remaining source and publish
# PublishRunWebpack runs here: npm install (fast, already present) + npm run build
COPY . .
RUN dotnet publish inex/inex.csproj -c Release -o /app/publish --no-restore

# Runtime stage - lean image, no SDK or Node.js
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80
ENTRYPOINT ["dotnet", "inex.dll"]
