
<?php

/**
 * 基于smarty的静态资源管理的统计方式示例
 * 加上钩子之后，用户调用{%require%}插件加载资源就会被统计
 */

function smarty_compiler_require($arrParams,  $smarty){
    $strName = $arrParams['name'];

    $async = 'false';

    if (isset($arrParams['async'])) {
        $async = trim($arrParams['async'], "'\" ");
        if ($async !== 'true') {
            $async = 'false';
        }
    }

    $strCode = '';
    if($strName){
        $strResourceApiPath = preg_replace('/[\\/\\\\]+/', '/', dirname(__FILE__) . '/FISResource.class.php');
        $strCode .= '<?php if(!class_exists(\'FISResource\', false)){require_once(\'' . $strResourceApiPath . '\');}';
        $strCode .= 'FISResource::load(' . $strName . ',$_smarty_tpl->smarty, '.$async.');';

        /********autopack collect require resource************/
        //此处加钩子调用统计脚本
        /*****************autopack end**********************/
        
        $strCode .= '?>';
    }
    return $strCode;
}