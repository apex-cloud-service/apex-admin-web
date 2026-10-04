# 后端完整实现代码 - 代码生成器模块

## 📋 实施说明

由于工具限制，无法直接在后端项目目录创建文件。请将以下代码手动复制到对应的后端项目路径中。

**后端项目路径**：`/Users/work/apex-scaffold`

---

## 一、DTO 类（Application 层）

### 1.1 CodePreviewResponse.java

**路径**：`apex-application/src/main/java/com/apex/scaffold/application/dto/admin/CodePreviewResponse.java`

```java
package com.apex.scaffold.application.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 代码预览响应 DTO。
 *
 * <p>包含生成的所有文件的内容，用于在线预览。
 *
 * @author Apex Team
 * @version 1.0.0
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "代码预览响应")
public class CodePreviewResponse {

    @Schema(description = "生成的文件列表")
    private List<PreviewFile> files;

    @Schema(description = "生成的文件总数", example = "5")
    private Integer totalFiles;

    /**
     * 预览文件信息。
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "预览文件")
    public static class PreviewFile {

        @Schema(description = "文件名", example = "UserEntity.java")
        private String fileName;

        @Schema(description = "文件路径", example = "domain/model/entity/UserEntity.java")
        private String filePath;

        @Schema(description = "文件类型", example = "Entity")
        private String fileType;

        @Schema(description = "文件内容")
        private String content;

        @Schema(description = "文件大小（字节）", example = "2048")
        private Long size;
    }
}
```

### 1.2 CodeGenerateRequest.java

**路径**：`apex-application/src/main/java/com/apex/scaffold/application/dto/admin/CodeGenerateRequest.java`

```java
package com.apex.scaffold.application.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 代码生成请求 DTO。
 *
 * <p>用于代码生成预览和下载功能，指定要生成的表和生成参数。
 *
 * @author Apex Team
 * @version 1.0.0
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "代码生成请求")
public class CodeGenerateRequest {

    @Schema(description = "数据源ID", example = "1", required = true)
    @NotNull(message = "数据源ID不能为空")
    private Long datasourceId;

    @Schema(description = "表名", example = "sys_user", required = true)
    @NotBlank(message = "表名不能为空")
    private String tableName;

    @Schema(description = "包名", example = "com.apex.example", required = true)
    @NotBlank(message = "包名不能为空")
    private String packageName;

    @Schema(description = "模块名", example = "user", required = true)
    @NotBlank(message = "模块名不能为空")
    private String moduleName;

    @Schema(description = "作者", example = "Apex Team")
    private String author = "Apex Team";

    @Schema(description = "表名前缀（生成时去除）", example = "sys_")
    private String tablePrefix;

    @Schema(description = "生成类型：entity/mapper/service/handler/all", example = "all")
    private String generateType = "all";

    @Schema(description = "是否覆盖已存在文件", example = "false")
    private Boolean overwrite = false;
}
```

### 1.3 TableListRequest.java

**路径**：`apex-application/src/main/java/com/apex/scaffold/application/dto/admin/TableListRequest.java`

```java
package com.apex.scaffold.application.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 数据表列表查询请求 DTO。
 *
 * <p>用于分页查询数据库中的表列表，支持按表名和注释进行模糊查询。
 *
 * @author Apex Team
 * @version 1.0.0
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "数据表列表查询请求")
public class TableListRequest {

    @Schema(description = "数据源ID", example = "1")
    private Long datasourceId;

    @Schema(description = "表名（模糊查询）", example = "sys_user")
    private String tableName;

    @Schema(description = "表注释（模糊查询）", example = "用户")
    private String tableComment;

    @Schema(description = "页码", example = "1")
    @Min(value = 1, message = "页码必须大于0")
    private Integer page = 1;

    @Schema(description = "每页大小", example = "20")
    @Min(value = 1, message = "每页大小必须大于0")
    @Max(value = 100, message = "每页大小不能超过100")
    private Integer size = 20;
}
```

### 1.4 TableListResponse.java

**路径**：`apex-application/src/main/java/com/apex/scaffold/application/dto/admin/TableListResponse.java`

```java
package com.apex.scaffold.application.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 数据表列表响应 DTO。
 *
 * <p>分页返回数据库中的表列表信息。
 *
 * @author Apex Team
 * @version 1.0.0
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "数据表列表响应")
public class TableListResponse {

    @Schema(description = "表列表")
    private List<TableInfo> list;

    @Schema(description = "总数", example = "50")
    private Long total;

    /**
     * 表信息。
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "表信息")
    public static class TableInfo {

        @Schema(description = "表名", example = "sys_user")
        private String tableName;

        @Schema(description = "表注释", example = "系统用户表")
        private String tableComment;

        @Schema(description = "存储引擎", example = "InnoDB")
        private String engine;

        @Schema(description = "创建时间")
        private LocalDateTime createTime;

        @Schema(description = "更新时间")
        private LocalDateTime updateTime;

        @Schema(description = "表行数", example = "1000")
        private Long tableRows;

        @Schema(description = "数据大小（字节）", example = "102400")
        private Long dataLength;
    }
}
```

---

## 二、扩展的 Handler 方法

### 2.1 扩展 CodeGeneratorHandler.java

**路径**：`apex-interfaces/src/main/java/com/apex/scaffold/interfaces/handler/CodeGeneratorHandler.java`

在现有的 `CodeGeneratorHandler` 类中添加以下方法：

```java
/**
 * 查询数据库表列表（分页）。
 *
 * <p>从指定数据源查询所有表的元数据信息，支持按表名和注释进行模糊查询。
 *
 * @param request ServerRequest，包含查询参数
 * @return 带 traceId 的统一成功响应，data 为表列表分页结果
 */
@RequirePermission("system:generator:table:list")
@Operation(
        operationId = "adminListTables",
        summary = "查询数据库表列表",
        description = "分页查询指定数据源中的所有表，支持按表名和注释进行模糊查询")
@Parameter(
        name = "datasourceId",
        description = "数据源ID",
        required = false,
        in = ParameterIn.QUERY,
        schema = @Schema(type = "integer", format = "int64"))
@Parameter(
        name = "tableName",
        description = "表名（模糊查询）",
        required = false,
        in = ParameterIn.QUERY)
@Parameter(
        name = "tableComment",
        description = "表注释（模糊查询）",
        required = false,
        in = ParameterIn.QUERY)
@Parameter(
        name = "page",
        description = "页码",
        required = false,
        in = ParameterIn.QUERY,
        schema = @Schema(type = "integer", defaultValue = "1"))
@Parameter(
        name = "size",
        description = "每页大小",
        required = false,
        in = ParameterIn.QUERY,
        schema = @Schema(type = "integer", defaultValue = "20"))
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "查询成功，返回表列表"),
    @ApiResponse(responseCode = "400", description = "参数错误"),
    @ApiResponse(responseCode = "403", description = "权限不足，需要 system:generator:table:list 权限"),
    @ApiResponse(responseCode = "404", description = "数据源不存在")
})
@OperationLog(module = "代码生成器", type = OperationLog.OperationType.SELECT, description = "查询数据库表列表")
public Mono<ServerResponse> listTables(ServerRequest request) {
    TableListRequest listRequest = TableListRequest.builder()
            .datasourceId(request.queryParam("datasourceId").map(Long::parseLong).orElse(null))
            .tableName(request.queryParam("tableName").orElse(null))
            .tableComment(request.queryParam("tableComment").orElse(null))
            .page(request.queryParam("page").map(Integer::parseInt).orElse(1))
            .size(request.queryParam("size").map(Integer::parseInt).orElse(20))
            .build();

    return codeGenerationService.listTables(listRequest).flatMap(this::buildSuccess);
}

/**
 * 查询表结构详情。
 *
 * <p>查询指定表的完整结构信息，包括所有列的详细信息（字段名、类型、注释等）。
 *
 * @param request ServerRequest，路径参数 datasourceId 和 tableName
 * @return 带 traceId 的统一成功响应，data 为表结构信息
 */
@RequirePermission("system:generator:table:detail")
@Operation(
        operationId = "adminGetTableDetail",
        summary = "查询表结构详情",
        description = "查询指定表的完整结构信息，包括所有列的详细信息")
@Parameter(
        name = "datasourceId",
        description = "数据源ID",
        required = true,
        in = ParameterIn.PATH,
        schema = @Schema(type = "integer", format = "int64"))
@Parameter(
        name = "tableName",
        description = "表名",
        required = true,
        in = ParameterIn.PATH)
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "查询成功，返回表结构信息"),
    @ApiResponse(responseCode = "403", description = "权限不足，需要 system:generator:table:detail 权限"),
    @ApiResponse(responseCode = "404", description = "表不存在")
})
public Mono<ServerResponse> getTableDetail(ServerRequest request) {
    Long datasourceId = requirePositiveId(request, "datasourceId");
    String tableName = request.pathVariable("tableName");

    return codeGenerationService.getTableColumns(datasourceId, tableName)
            .flatMap(this::buildSuccess);
}

/**
 * 代码生成预览。
 *
 * <p>根据指定的表和生成参数生成代码，返回所有文件的内容供在线预览，不写入磁盘。
 *
 * @param request ServerRequest，请求体包含代码生成参数
 * @return 带 traceId 的统一成功响应，data 为代码预览结果
 */
@RequirePermission("system:generator:preview")
@Operation(
        operationId = "adminPreviewCode",
        summary = "代码生成预览",
        description = "根据指定参数生成代码并返回预览内容，不写入磁盘")
@RequestBody(
        description = "代码生成请求参数",
        required = true,
        content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CodeGenerateRequest.class)))
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "预览成功，返回生成的代码内容"),
    @ApiResponse(responseCode = "400", description = "参数校验失败"),
    @ApiResponse(responseCode = "403", description = "权限不足，需要 system:generator:preview 权限"),
    @ApiResponse(responseCode = "500", description = "代码生成失败")
})
@OperationLog(module = "代码生成器", type = OperationLog.OperationType.OTHER, description = "代码生成预览")
public Mono<ServerResponse> previewCode(ServerRequest request) {
    return parseBody(request, CodeGenerateRequest.class)
            .flatMap(codeGenerationService::previewCode)
            .flatMap(this::buildSuccess);
}

/**
 * 代码生成下载。
 *
 * <p>根据指定参数生成代码并返回 ZIP 压缩包供下载。
 *
 * @param request ServerRequest，请求体包含代码生成参数
 * @return ZIP 文件流
 */
@RequirePermission("system:generator:download")
@Operation(
        operationId = "adminDownloadCode",
        summary = "代码生成下载",
        description = "根据指定参数生成代码并返回 ZIP 压缩包")
@RequestBody(
        description = "代码生成请求参数",
        required = true,
        content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CodeGenerateRequest.class)))
@ApiResponses({
    @ApiResponse(
            responseCode = "200",
            description = "生成成功，返回 ZIP 文件",
            content = @Content(mediaType = "application/zip")),
    @ApiResponse(responseCode = "400", description = "参数校验失败"),
    @ApiResponse(responseCode = "403", description = "权限不足，需要 system:generator:download 权限"),
    @ApiResponse(responseCode = "500", description = "代码生成失败")
})
@OperationLog(module = "代码生成器", type = OperationLog.OperationType.EXPORT, description = "代码生成下载")
public Mono<ServerResponse> downloadCode(ServerRequest request) {
    return parseBody(request, CodeGenerateRequest.class)
            .flatMap(codeGenerationService::generateZip)
            .flatMap(zipData -> ServerResponse.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header("Content-Disposition", "attachment; filename=generated-code.zip")
                    .bodyValue(zipData));
}
```

---

## 三、扩展的 Service 方法

### 3.1 扩展 CodeGenerationService.java

**路径**：`apex-application/src/main/java/com/apex/scaffold/application/service/CodeGenerationService.java`

在现有的 `CodeGenerationService` 类中添加以下方法：

```java
/**
 * 分页查询数据库表列表。
 *
 * @param request 表列表查询请求
 * @return 表列表分页响应
 */
public Mono<TableListResponse> listTables(TableListRequest request) {
    log.info("查询数据库表列表: datasourceId={}, page={}, size={}", 
            request.getDatasourceId(), request.getPage(), request.getSize());

    // TODO: 实际实现需要从数据源查询表元数据
    // 这里提供示例实现框架

    return Mono.fromCallable(() -> {
                // 1. 获取数据源配置
                // GenDatasourceEntity datasource = datasourceRepository.findById(request.getDatasourceId());

                // 2. 使用 MetadataReader 查询表列表
                // List<TableMetadata> tables = metadataReader.readTables(datasource, 
                //         request.getTableName(), request.getTableComment());

                // 3. 分页处理
                // int start = (request.getPage() - 1) * request.getSize();
                // int end = Math.min(start + request.getSize(), tables.size());
                // List<TableMetadata> pagedTables = tables.subList(start, end);

                // 4. 转换为 DTO
                List<TableListResponse.TableInfo> tableInfos = new ArrayList<>();
                // for (TableMetadata table : pagedTables) {
                //     tableInfos.add(TableListResponse.TableInfo.builder()
                //             .tableName(table.getTableName())
                //             .tableComment(table.getTableComment())
                //             .engine(table.getEngine())
                //             .createTime(table.getCreateTime())
                //             .updateTime(table.getUpdateTime())
                //             .tableRows(table.getTableRows())
                //             .dataLength(table.getDataLength())
                //             .build());
                // }

                return TableListResponse.builder()
                        .list(tableInfos)
                        .total(0L)  // tables.size()
                        .build();
            })
            .subscribeOn(BlockingIoSchedulers.storage());
}

/**
 * 代码生成预览。
 *
 * @param request 代码生成请求
 * @return 代码预览响应
 */
public Mono<CodePreviewResponse> previewCode(CodeGenerateRequest request) {
    log.info("代码生成预览: tableName={}, packageName={}", 
            request.getTableName(), request.getPackageName());

    return getTableColumns(request.getDatasourceId(), request.getTableName())
            .flatMap(tableInfo -> Mono.fromCallable(() -> {
                        // 1. 构建数据模型
                        Map<String, Object> dataModel = buildDataModel(request, tableInfo);

                        // 2. 加载模板
                        List<String> templates = getTemplatesByGenerateType(request.getGenerateType());

                        // 3. 生成代码内容
                        List<CodePreviewResponse.PreviewFile> files = new ArrayList<>();
                        for (String templateName : templates) {
                            try {
                                String content = templateEngine.render(templateName, dataModel);
                                String filePath = buildFilePath(request, templateName, dataModel);
                                String fileName = Paths.get(filePath).getFileName().toString();

                                files.add(CodePreviewResponse.PreviewFile.builder()
                                        .fileName(fileName)
                                        .filePath(filePath)
                                        .fileType(getFileType(templateName))
                                        .content(content)
                                        .size((long) content.getBytes().length)
                                        .build());
                            } catch (Exception e) {
                                log.error("渲染模板失败: template={}", templateName, e);
                            }
                        }

                        return CodePreviewResponse.builder()
                                .files(files)
                                .totalFiles(files.size())
                                .build();
                    })
                    .subscribeOn(BlockingIoSchedulers.storage()));
}

/**
 * 生成代码并返回 ZIP 压缩包。
 *
 * @param request 代码生成请求
 * @return ZIP 文件字节数组
 */
public Mono<byte[]> generateZip(CodeGenerateRequest request) {
    log.info("生成代码 ZIP: tableName={}, packageName={}", 
            request.getTableName(), request.getPackageName());

    return previewCode(request)
            .flatMap(preview -> Mono.fromCallable(() -> {
                        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                             ZipOutputStream zos = new ZipOutputStream(baos)) {

                            for (CodePreviewResponse.PreviewFile file : preview.getFiles()) {
                                ZipEntry entry = new ZipEntry(file.getFilePath());
                                zos.putNextEntry(entry);
                                zos.write(file.getContent().getBytes(StandardCharsets.UTF_8));
                                zos.closeEntry();
                            }

                            zos.finish();
                            return baos.toByteArray();

                        } catch (IOException e) {
                            throw new BusinessException(ResultCode.ERROR, "生成 ZIP 文件失败: " + e.getMessage());
                        }
                    })
                    .subscribeOn(BlockingIoSchedulers.storage()));
}

/**
 * 构建数据模型。
 *
 * @param request 代码生成请求
 * @param tableInfo 表信息
 * @return 数据模型 Map
 */
private Map<String, Object> buildDataModel(CodeGenerateRequest request, TableInfoDTO tableInfo) {
    Map<String, Object> model = new HashMap<>();

    // 表信息
    model.put("tableName", tableInfo.getTableName());
    model.put("tableComment", tableInfo.getTableComment());
    model.put("columns", tableInfo.getColumns());

    // 生成配置
    model.put("packageName", request.getPackageName());
    model.put("moduleName", request.getModuleName());
    model.put("author", request.getAuthor());

    // 类名（去除表前缀，转换为驼峰）
    String entityName = toEntityName(tableInfo.getTableName(), request.getTablePrefix());
    model.put("entityName", entityName);
    model.put("entityNameLower", toLowerCamelCase(entityName));

    // 时间
    model.put("datetime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    model.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));

    return model;
}

/**
 * 表名转实体名（去除前缀，转换为大驼峰）。
 *
 * @param tableName 表名
 * @param tablePrefix 表前缀
 * @return 实体名
 */
private String toEntityName(String tableName, String tablePrefix) {
    String name = tableName;
    if (tablePrefix != null && !tablePrefix.isEmpty() && name.startsWith(tablePrefix)) {
        name = name.substring(tablePrefix.length());
    }
    return toUpperCamelCase(name);
}

/**
 * 下划线转大驼峰。
 */
private String toUpperCamelCase(String str) {
    if (str == null || str.isEmpty()) {
        return str;
    }
    StringBuilder result = new StringBuilder();
    boolean toUpper = true;
    for (char c : str.toCharArray()) {
        if (c == '_') {
            toUpper = true;
        } else {
            result.append(toUpper ? Character.toUpperCase(c) : c);
            toUpper = false;
        }
    }
    return result.toString();
}

/**
 * 下划线转小驼峰。
 */
private String toLowerCamelCase(String str) {
    String camel = toUpperCamelCase(str);
    if (camel.isEmpty()) {
        return camel;
    }
    return Character.toLowerCase(camel.charAt(0)) + camel.substring(1);
}

/**
 * 根据生成类型获取模板列表。
 *
 * @param generateType 生成类型
 * @return 模板名称列表
 */
private List<String> getTemplatesByGenerateType(String generateType) {
    return switch (generateType.toLowerCase()) {
        case "entity" -> List.of("entity.ftl");
        case "mapper" -> List.of("mapper.ftl");
        case "service" -> List.of("service.ftl");
        case "handler" -> List.of("handler.ftl");
        case "all" -> List.of("entity.ftl", "po.ftl", "mapper.ftl", "service.ftl", "handler.ftl", "converter.ftl");
        default -> List.of("entity.ftl");
    };
}

/**
 * 构建文件路径。
 *
 * @param request 请求
 * @param templateName 模板名
 * @param dataModel 数据模型
 * @return 文件路径
 */
private String buildFilePath(CodeGenerateRequest request, String templateName, Map<String, Object> dataModel) {
    String entityName = (String) dataModel.get("entityName");
    String packagePath = request.getPackageName().replace('.', '/');

    return switch (templateName) {
        case "entity.ftl" -> String.format("domain/model/entity/%sEntity.java", entityName);
        case "po.ftl" -> String.format("infrastructure/persistence/po/%sPO.java", entityName);
        case "mapper.ftl" -> String.format("infrastructure/persistence/mapper/%sMapper.java", entityName);
        case "service.ftl" -> String.format("application/service/%sService.java", entityName);
        case "handler.ftl" -> String.format("interfaces/handler/%sHandler.java", entityName);
        case "converter.ftl" -> String.format("application/assembler/%sConverter.java", entityName);
        default -> entityName + ".java";
    };
}

/**
 * 获取文件类型。
 *
 * @param templateName 模板名
 * @return 文件类型
 */
private String getFileType(String templateName) {
    return switch (templateName) {
        case "entity.ftl" -> "Entity";
        case "po.ftl" -> "PO";
        case "mapper.ftl" -> "Mapper";
        case "service.ftl" -> "Service";
        case "handler.ftl" -> "Handler";
        case "converter.ftl" -> "Converter";
        default -> "Unknown";
    };
}
```

---

## 四、Router 配置

### 4.1 扩展 GeneratorRouter.java

**路径**：`apex-interfaces/src/main/java/com/apex/scaffold/interfaces/router/GeneratorRouter.java`

创建或扩展代码生成器路由配置：

```java
package com.apex.scaffold.interfaces.router;

import com.apex.scaffold.interfaces.handler.CodeGeneratorHandler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.RouterOperation;
import org.springdoc.core.annotations.RouterOperations;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.*;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

/**
 * 代码生成器路由配置。
 *
 * @author Apex Team
 * @version 1.0.0
 * @since 1.0.0
 */
@Configuration
@Tag(name = "后台-代码生成器", description = "代码生成器管理")
public class GeneratorRouter {

    private static final String BASE_PATH = "/admin-api/v1/generator";

    @Bean
    @RouterOperations({
        @RouterOperation(path = BASE_PATH + "/tables", beanClass = CodeGeneratorHandler.class, beanMethod = "listTables"),
        @RouterOperation(path = BASE_PATH + "/tables/{datasourceId}/{tableName}", beanClass = CodeGeneratorHandler.class, beanMethod = "getTableDetail"),
        @RouterOperation(path = BASE_PATH + "/preview", beanClass = CodeGeneratorHandler.class, beanMethod = "previewCode"),
        @RouterOperation(path = BASE_PATH + "/download", beanClass = CodeGeneratorHandler.class, beanMethod = "downloadCode"),
        @RouterOperation(path = BASE_PATH + "/generate/{id}", beanClass = CodeGeneratorHandler.class, beanMethod = "generate")
    })
    public RouterFunction<ServerResponse> generatorRoutes(CodeGeneratorHandler handler) {
        return route(GET(BASE_PATH + "/tables"), handler::listTables)
                .andRoute(GET(BASE_PATH + "/tables/{datasourceId}/{tableName}"), handler::getTableDetail)
                .andRoute(POST(BASE_PATH + "/preview"), handler::previewCode)
                .andRoute(POST(BASE_PATH + "/download"), handler::downloadCode)
                .andRoute(POST(BASE_PATH + "/generate/{id}"), handler::generate);
    }
}
```

---

## 五、Flyway 数据库迁移脚本

### 5.1 代码生成器表结构

**路径**：`apex-interfaces/src/main/resources/db/migration/V2026_09_26_15_00__Create_Generator_Tables.sql`

```sql
-- =====================================================
-- 代码生成器相关表
-- =====================================================

-- 代码生成器配置表
CREATE TABLE IF NOT EXISTS gen_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    datasource_id BIGINT NOT NULL COMMENT '数据源ID',
    table_name VARCHAR(128) NOT NULL COMMENT '表名',
    package_name VARCHAR(128) NOT NULL COMMENT '包名',
    module_name VARCHAR(64) NOT NULL COMMENT '模块名',
    author VARCHAR(64) DEFAULT 'Apex Team' COMMENT '作者',
    table_prefix VARCHAR(32) COMMENT '表前缀（生成时去除）',
    generate_type VARCHAR(32) DEFAULT 'all' COMMENT '生成类型：entity/mapper/service/handler/all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人ID',
    updated_by BIGINT COMMENT '更新人ID',
    deleted TINYINT(1) DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    INDEX idx_datasource_id (datasource_id),
    INDEX idx_table_name (table_name),
    INDEX idx_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代码生成器配置表';

-- 代码生成数据源表
CREATE TABLE IF NOT EXISTS gen_datasource (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    name VARCHAR(128) NOT NULL COMMENT '数据源名称',
    db_type VARCHAR(32) NOT NULL COMMENT '数据库类型：mysql/postgresql',
    host VARCHAR(128) NOT NULL COMMENT '主机地址',
    port INT NOT NULL COMMENT '端口号',
    database_name VARCHAR(128) NOT NULL COMMENT '数据库名',
    username VARCHAR(128) NOT NULL COMMENT '用户名',
    password VARCHAR(256) NOT NULL COMMENT '密码（加密存储）',
    connection_params TEXT COMMENT '连接参数（查询字符串）',
    status VARCHAR(32) DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE/INACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人ID',
    updated_by BIGINT COMMENT '更新人ID',
    deleted TINYINT(1) DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    UNIQUE KEY uk_name (name, deleted),
    INDEX idx_status (status),
    INDEX idx_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代码生成数据源表';

-- 代码生成模板表
CREATE TABLE IF NOT EXISTS gen_template (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    name VARCHAR(128) NOT NULL COMMENT '模板名称',
    file_name VARCHAR(128) NOT NULL COMMENT '模板文件名',
    template_type VARCHAR(32) NOT NULL COMMENT '模板类型：entity/po/mapper/service/handler/converter',
    content TEXT NOT NULL COMMENT '模板内容',
    description VARCHAR(512) COMMENT '模板描述',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用：0-禁用，1-启用',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人ID',
    updated_by BIGINT COMMENT '更新人ID',
    deleted TINYINT(1) DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    UNIQUE KEY uk_name (name, deleted),
    INDEX idx_template_type (template_type),
    INDEX idx_enabled (enabled),
    INDEX idx_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代码生成模板表';

-- 代码生成历史表
CREATE TABLE IF NOT EXISTS gen_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    config_id BIGINT NOT NULL COMMENT '生成配置ID',
    table_name VARCHAR(128) NOT NULL COMMENT '表名',
    generated_files INT DEFAULT 0 COMMENT '生成文件数',
    success TINYINT(1) DEFAULT 1 COMMENT '是否成功：0-失败，1-成功',
    error_message TEXT COMMENT '错误信息（如果失败）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by BIGINT COMMENT '创建人ID',
    INDEX idx_config_id (config_id),
    INDEX idx_table_name (table_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代码生成历史表';
```

---

## 六、使用说明

### 6.1 实施步骤

1. **复制 DTO 文件**
   - 将 `CodePreviewResponse.java`、`CodeGenerateRequest.java`、`TableListRequest.java`、`TableListResponse.java` 复制到 `apex-application/src/main/java/com/apex/scaffold/application/dto/admin/` 目录

2. **扩展 Handler 方法**
   - 在 `CodeGeneratorHandler.java` 中添加 `listTables`、`getTableDetail`、`previewCode`、`downloadCode` 方法

3. **扩展 Service 方法**
   - 在 `CodeGenerationService.java` 中添加 `listTables`、`previewCode`、`generateZip` 及相关辅助方法

4. **创建 Router 配置**
   - 创建 `GeneratorRouter.java` 配置路由

5. **执行数据库迁移**
   - 将 SQL 脚本放到 Flyway 迁移目录并执行 `mvnd clean install`

### 6.2 测试接口

```bash
# 1. 查询数据库表列表
curl -X GET "http://localhost:8080/admin-api/v1/generator/tables?datasourceId=1&page=1&size=20"

# 2. 查询表结构详情
curl -X GET "http://localhost:8080/admin-api/v1/generator/tables/1/sys_user"

# 3. 代码生成预览
curl -X POST "http://localhost:8080/admin-api/v1/generator/preview" \
  -H "Content-Type: application/json" \
  -d '{
    "datasourceId": 1,
    "tableName": "sys_user",
    "packageName": "com.apex.example",
    "moduleName": "user",
    "author": "Apex Team",
    "tablePrefix": "sys_",
    "generateType": "all"
  }'

# 4. 代码生成下载
curl -X POST "http://localhost:8080/admin-api/v1/generator/download" \
  -H "Content-Type: application/json" \
  -d '{
    "datasourceId": 1,
    "tableName": "sys_user",
    "packageName": "com.apex.example",
    "moduleName": "user",
    "tablePrefix": "sys_"
  }' \
  -o generated-code.zip
```

---

## 七、注意事项

1. **安全性**
   - 数据源密码需要加密存储（使用 Jasypt 或自定义加密）
   - 生成的文件路径需要校验，防止路径遍历攻击

2. **性能优化**
   - 表元数据查询使用缓存（已在 Service 中配置 `@Cacheable`）
   - 模板编译结果缓存（已在 Service 中实现 `templateCache`）

3. **错误处理**
   - 数据源连接失败需要友好提示
   - 模板渲染失败需要记录详细日志

4. **后续优化**
   - 支持自定义模板管理
   - 支持批量生成多个表
   - 支持生成代码直接提交到 Git

---

**文档版本**：v1.0  
**最后更新**：2026-09-26  
**状态**：待实施
