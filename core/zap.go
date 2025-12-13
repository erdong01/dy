package core

import (
	"fmt"
	"os"
	"time"

	"video/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var Logger *zap.Logger

// Zap 初始化日志
func Zap(cfg config.Zap) *zap.Logger {
	if ok, _ := PathExists(cfg.Director); !ok {
		_ = os.Mkdir(cfg.Director, os.ModePerm)
	}

	cores := make([]zapcore.Core, 0, 7)
	levels := getLevels(cfg)

	for i := 0; i < len(levels); i++ {
		core := zapcore.NewCore(
			getEncoder(cfg),
			getWriteSyncer(cfg, levels[i].String()),
			zap.LevelEnablerFunc(func(lv zapcore.Level) bool {
				return lv == levels[i]
			}),
		)
		cores = append(cores, core)
	}

	Logger = zap.New(zapcore.NewTee(cores...))

	if cfg.ShowLine {
		Logger = Logger.WithOptions(zap.AddCaller())
	}

	return Logger
}

// getLevels 根据配置获取需要记录的日志级别
func getLevels(cfg config.Zap) []zapcore.Level {
	levels := make([]zapcore.Level, 0, 7)
	level := getLoggerLevel(cfg.Level)
	for ; level <= zapcore.FatalLevel; level++ {
		levels = append(levels, level)
	}
	return levels
}

// getLoggerLevel 获取 zapcore.Level
func getLoggerLevel(level string) zapcore.Level {
	switch level {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	case "dpanic":
		return zapcore.DPanicLevel
	case "panic":
		return zapcore.PanicLevel
	case "fatal":
		return zapcore.FatalLevel
	default:
		return zapcore.InfoLevel
	}
}

// getEncoder 获取日志编码器
func getEncoder(cfg config.Zap) zapcore.Encoder {
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "time",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "msg",
		StacktraceKey:  cfg.StacktraceKey,
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    getEncodeLevel(cfg.EncodeLevel),
		EncodeTime:     customTimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	if cfg.Format == "json" {
		return zapcore.NewJSONEncoder(encoderConfig)
	}
	return zapcore.NewConsoleEncoder(encoderConfig)
}

// getEncodeLevel 获取编码级别
func getEncodeLevel(encodeLevel string) zapcore.LevelEncoder {
	switch encodeLevel {
	case "lowercase":
		return zapcore.LowercaseLevelEncoder
	case "capital":
		return zapcore.CapitalLevelEncoder
	case "lowercase-color":
		return zapcore.LowercaseColorLevelEncoder
	case "capital-color":
		return zapcore.CapitalColorLevelEncoder
	default:
		return zapcore.LowercaseLevelEncoder
	}
}

// customTimeEncoder 自定义时间格式
func customTimeEncoder(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
	enc.AppendString(t.Format("2006-01-02 15:04:05.000"))
}

// getWriteSyncer 获取日志输出
func getWriteSyncer(cfg config.Zap, level string) zapcore.WriteSyncer {
	fileWriter := &lumberjack.Logger{
		Filename:   fmt.Sprintf("%s/%s.log", cfg.Director, level),
		MaxSize:    cfg.MaxSize,
		MaxBackups: cfg.MaxBackups,
		MaxAge:     cfg.MaxAge,
		Compress:   cfg.Compress,
	}

	if cfg.LogInConsole {
		return zapcore.NewMultiWriteSyncer(zapcore.AddSync(os.Stdout), zapcore.AddSync(fileWriter))
	}
	return zapcore.AddSync(fileWriter)
}

// PathExists 判断路径是否存在
func PathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

// ========== 便捷方法封装 ==========

// Debug 输出 debug 级别日志
func Debug(msg string, fields ...zap.Field) {
	Logger.Debug(msg, fields...)
}

// Info 输出 info 级别日志
func Info(msg string, fields ...zap.Field) {
	Logger.Info(msg, fields...)
}

// Warn 输出 warn 级别日志
func Warn(msg string, fields ...zap.Field) {
	Logger.Warn(msg, fields...)
}

// Error 输出 error 级别日志
func Error(msg string, fields ...zap.Field) {
	Logger.Error(msg, fields...)
}

// DPanic 输出 dpanic 级别日志
func DPanic(msg string, fields ...zap.Field) {
	Logger.DPanic(msg, fields...)
}

// Panic 输出 panic 级别日志
func Panic(msg string, fields ...zap.Field) {
	Logger.Panic(msg, fields...)
}

// Fatal 输出 fatal 级别日志
func Fatal(msg string, fields ...zap.Field) {
	Logger.Fatal(msg, fields...)
}

// Debugf 输出格式化 debug 级别日志
func Debugf(template string, args ...interface{}) {
	Logger.Sugar().Debugf(template, args...)
}

// Infof 输出格式化 info 级别日志
func Infof(template string, args ...interface{}) {
	Logger.Sugar().Infof(template, args...)
}

// Warnf 输出格式化 warn 级别日志
func Warnf(template string, args ...interface{}) {
	Logger.Sugar().Warnf(template, args...)
}

// Errorf 输出格式化 error 级别日志
func Errorf(template string, args ...interface{}) {
	Logger.Sugar().Errorf(template, args...)
}

// DPanicf 输出格式化 dpanic 级别日志
func DPanicf(template string, args ...interface{}) {
	Logger.Sugar().DPanicf(template, args...)
}

// Panicf 输出格式化 panic 级别日志
func Panicf(template string, args ...interface{}) {
	Logger.Sugar().Panicf(template, args...)
}

// Fatalf 输出格式化 fatal 级别日志
func Fatalf(template string, args ...interface{}) {
	Logger.Sugar().Fatalf(template, args...)
}

// Sync 同步日志缓冲区
func Sync() error {
	return Logger.Sync()
}
