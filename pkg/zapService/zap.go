package zapService

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	logger           *zap.Logger
	sugar            *zap.SugaredLogger
	loggerOnce       sync.Once
	logPath          = "./logs" // Default log directory
	lumberJackLogger *lumberjack.Logger
)

type Config struct {
	Level         zapcore.Level
	LogPath       string                 // Path to the log directory
	MaxSizeMB     int                    // Max size in MB before rotation
	MaxBackups    int                    // Max number of old log files to retain
	MaxAgeDays    int                    // Max number of days to retain old log files
	Compress      bool                   // Whether to compress old log files
	Development   bool                   // Development mode flag
	InitialFields map[string]interface{} // Initial fields for all log entries
}

func InitLogger(config Config) {
	loggerOnce.Do(func() {
		// Set the log path from the configuration
		if config.LogPath != "" {
			logPath = config.LogPath
		}

		// Ensure the log directory exists
		if err := os.MkdirAll(logPath, 0755); err != nil {
			fmt.Printf("Error creating log directory: %v\n", err)
			panic(err) // Critical: Logger cannot function
		}

		// Create a lumberjack logger (for file rotation).
		w := zapcore.AddSync(&lumberjack.Logger{
			Filename:   filepath.Join(logPath, "app.log"), // Base log file name
			MaxSize:    config.MaxSizeMB,                  // Max size in megabytes
			MaxBackups: config.MaxBackups,                 // Max number of old log files to retain
			MaxAge:     config.MaxAgeDays,                 // Max number of days to retain old log files
			Compress:   config.Compress,                   // Compress rotated files
			LocalTime:  true,                              // Use local time for timestamps
		})

		// Define the encoder configuration
		encoderConfig := zap.NewProductionEncoderConfig()
		if config.Development {
			encoderConfig = zap.NewDevelopmentEncoderConfig()
		}
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder // Or your preferred format

		// Create a core that writes to the lumberjack (file rotation).
		core := zapcore.NewCore(
			zapcore.NewJSONEncoder(encoderConfig), // JSON encoder for file
			w,                                     // WriteSyncer (lumberjack)
			config.Level,                          // Log level
		)

		// Add initial fields if any
		options := []zap.Option{}
		if len(config.InitialFields) > 0 {
			fields := make([]zapcore.Field, 0, len(config.InitialFields))
			for k, v := range config.InitialFields {
				fields = append(fields, zap.Any(k, v))
			}
			options = append(options, zap.Fields(fields...))
		}

		//Include Stack Trace for error logs
		options = append(options, zap.AddStacktrace(zapcore.ErrorLevel))
		options = append(options, zap.AddCaller()) //Adds caller to the log

		// Create the logger.
		logger = zap.New(core, options...)
		sugar = logger.Sugar()
	})
}

// GetLogger returns the global logger instance.
func GetLogger() *zap.Logger {
	if logger == nil {
		// Fallback to a default development logger if InitLogger hasn't been called
		fmt.Println("Warning: Logger not initialized.  Using default development logger.")
		InitLogger(Config{Level: zap.DebugLevel, Development: true}) // Initialize with default config
	}
	return logger
}

// GetSugar returns the global sugared logger instance.
func GetSugar() *zap.SugaredLogger {
	if sugar == nil {
		// Fallback to a default development logger if InitLogger hasn't been called
		fmt.Println("Warning: Logger not initialized.  Using default development logger.")
		InitLogger(Config{Level: zap.DebugLevel, Development: true}) // Initialize with default config
	}
	return sugar
}

// RotateLog rotates the log file manually, if needed (lumberjack handles this automatically usually).
func RotateLog() {
	if lumberJackLogger != nil {
		if err := lumberJackLogger.Rotate(); err != nil {
			fmt.Printf("Error rotating log file: %v\n", err)
		}
	} else {
		fmt.Println("Warning: Lumberjack logger not initialized.  Cannot rotate.")
	}
}

// Sync flushes any buffered log entries.  Call this before program exit.
func Sync() {
	if logger != nil {
		if err := logger.Sync(); err != nil {
			fmt.Fprintf(os.Stderr, "Error flushing logger: %v\n", err) // Use os.Stderr for errors
		}
	}
	if lumberJackLogger != nil { // Also sync the lumberjack logger directly
		if err := lumberJackLogger.Close(); err != nil {
			fmt.Fprintf(os.Stderr, "Error closing lumberjack logger: %v\n", err)
		}
	}
}
