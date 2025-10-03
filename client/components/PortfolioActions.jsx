import React, { useState } from 'react';
import { 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Space, 
  Popconfirm,
  Tooltip,
  Dropdown,
  Menu
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FolderAddOutlined,
  DownloadOutlined,
  UploadOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  portfolioGroupsAtom,
  selectedPortfolioGroupAtom,
  portfolioSearchKeywordAtom,
  portfolioSearchResultsAtom,
  portfolioSearchLoadingAtom,
  searchModalVisibleAtom,
  addGroupModalVisibleAtom,
  importModalVisibleAtom,
  addStockToPortfolioAtom,
  searchStocksAtom,
  addGroupToPortfolioAtom,
  exportPortfolioDataAtom,
  importPortfolioDataAtom,
  initializePortfolioAtom
} from '../atoms/portfolioAtoms.js';
import { StockService } from '../services/stockService.js';

const { Option } = Select;
const { TextArea } = Input;

export default function PortfolioActions({ 
  showGroupSelector = true, 
  showAddStock = true, 
  showSearch = true,
  showGroupManagement = true,
  showImportExport = true,
  compact = false 
}) {
  const [groups] = useAtom(portfolioGroupsAtom);
  const [selectedGroup, setSelectedGroup] = useAtom(selectedPortfolioGroupAtom);
  const [searchKeyword, setSearchKeyword] = useAtom(portfolioSearchKeywordAtom);
  const [searchResults] = useAtom(portfolioSearchResultsAtom);
  const [searchLoading] = useAtom(portfolioSearchLoadingAtom);
  const [searchModalVisible, setSearchModalVisible] = useAtom(searchModalVisibleAtom);
  const [addGroupModalVisible, setAddGroupModalVisible] = useAtom(addGroupModalVisibleAtom);
  const [importModalVisible, setImportModalVisible] = useAtom(importModalVisibleAtom);
  
  const addStockToPortfolio = useSetAtom(addStockToPortfolioAtom);
  const searchStocks = useSetAtom(searchStocksAtom);
  const addGroupToPortfolio = useSetAtom(addGroupToPortfolioAtom);
  const exportData = useSetAtom(exportPortfolioDataAtom);
  const importData = useSetAtom(importPortfolioDataAtom);
  const initializePortfolio = useSetAtom(initializePortfolioAtom);

  const [newStockCode, setNewStockCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [importDataText, setImportDataText] = useState('');
  const [addGroupForm] = Form.useForm();

  // 添加股票
  const handleAddStock = async () => {
    if (!newStockCode.trim()) {
      message.warning('请输入股票代码');
      return;
    }

    try {
      const stockInfo = await StockService.getStockInfo(newStockCode.trim());
      await addStockToPortfolio({
        stockCode: newStockCode.trim(),
        groupName: selectedGroup,
        stockInfo
      });
      
      setNewStockCode('');
      message.success(`已添加股票 ${stockInfo?.name || newStockCode} 到 ${selectedGroup} 分组`);
    } catch (error) {
      message.error(error.message || '添加股票失败');
    }
  };

  // 搜索股票
  const handleSearchStocks = async () => {
    if (!searchKeyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    try {
      await searchStocks(searchKeyword.trim());
    } catch (error) {
      message.error('搜索失败，请稍后重试');
    }
  };

  // 选择搜索到的股票
  const handleSelectStock = async (stock) => {
    try {
      const stockInfo = await StockService.getStockInfo(stock.code);
      await addStockToPortfolio({
        stockCode: stock.code,
        groupName: selectedGroup,
        stockInfo
      });
      
      setSearchModalVisible(false);
      setSearchKeyword('');
      message.success(`已添加股票 ${stockInfo?.name || stock.name || stock.code} 到 ${selectedGroup} 分组`);
    } catch (error) {
      message.error(error.message || '添加股票失败');
    }
  };

  // 添加分组
  const handleAddGroup = async () => {
    try {
      const values = await addGroupForm.validateFields();
      await addGroupToPortfolio({
        groupName: values.name,
        description: values.description,
        timeframe: values.timeframe || 'daily',
        indicators: values.indicators || [],
        showRating: values.showRating !== false
      });
      
      addGroupForm.resetFields();
      setAddGroupModalVisible(false);
      message.success(`已创建分组 ${values.name}`);
    } catch (error) {
      if (error.errorFields) {
        return; // 表单验证错误
      }
      message.error(error.message || '创建分组失败');
    }
  };

  // 导出数据
  const handleExportData = () => {
    try {
      exportData();
      message.success('数据导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 导入数据
  const handleImportData = () => {
    if (!importDataText.trim()) {
      message.warning('请输入要导入的数据');
      return;
    }

    try {
      importData(importDataText);
      setImportDataText('');
      setImportModalVisible(false);
      message.success('数据导入成功');
    } catch (error) {
      message.error(error.message || '导入失败');
    }
  };

  // 菜单项
  const menuItems = [
    ...(showAddStock ? [{
      key: 'add-stock',
      label: '添加股票',
      icon: <PlusOutlined />,
      onClick: () => setNewStockCode('')
    }] : []),
    ...(showSearch ? [{
      key: 'search-stock',
      label: '搜索股票',
      icon: <SearchOutlined />,
      onClick: () => setSearchModalVisible(true)
    }] : []),
    ...(showGroupManagement ? [{
      key: 'add-group',
      label: '新建分组',
      icon: <FolderAddOutlined />,
      onClick: () => setAddGroupModalVisible(true)
    }] : []),
    ...(showImportExport ? [
      {
        key: 'export',
        label: '导出数据',
        icon: <DownloadOutlined />,
        onClick: handleExportData
      },
      {
        key: 'import',
        label: '导入数据',
        icon: <UploadOutlined />,
        onClick: () => setImportModalVisible(true)
      }
    ] : [])
  ];

  const menu = (
    <Menu items={menuItems} />
  );

  if (compact) {
    return (
      <Space>
        {showGroupSelector && (
          <Select
            value={selectedGroup}
            onChange={setSelectedGroup}
            style={{ width: 120 }}
            size="small"
          >
            {Object.keys(groups).map(groupName => (
              <Option key={groupName} value={groupName}>{groupName}</Option>
            ))}
          </Select>
        )}
        
        <Dropdown overlay={menu} trigger={['click']}>
          <Button size="small" icon={<BookOutlined />}>
            自选股
          </Button>
        </Dropdown>
      </Space>
    );
  }

  return (
    <>
      <Space wrap>
        {showGroupSelector && (
          <Select
            value={selectedGroup}
            onChange={setSelectedGroup}
            style={{ width: 120 }}
          >
            {Object.keys(groups).map(groupName => (
              <Option key={groupName} value={groupName}>{groupName}</Option>
            ))}
          </Select>
        )}

        {showAddStock && (
          <Space.Compact>
            <Input
              placeholder="输入股票代码"
              value={newStockCode}
              onChange={(e) => setNewStockCode(e.target.value)}
              onPressEnter={handleAddStock}
              style={{ width: 150 }}
            />
            <Button 
              type="primary" 
              onClick={handleAddStock}
              icon={<PlusOutlined />}
            >
              添加
            </Button>
          </Space.Compact>
        )}

        {showSearch && (
          <Button 
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
          >
            搜索股票
          </Button>
        )}

        {showGroupManagement && (
          <Button 
            icon={<FolderAddOutlined />}
            onClick={() => setAddGroupModalVisible(true)}
          >
            新建分组
          </Button>
        )}

        {showImportExport && (
          <>
            <Button 
              icon={<DownloadOutlined />}
              onClick={handleExportData}
            >
              导出
            </Button>
            <Button 
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              导入
            </Button>
          </>
        )}
      </Space>

      {/* 搜索股票模态框 */}
      <Modal
        title="搜索股票"
        open={searchModalVisible}
        onCancel={() => setSearchModalVisible(false)}
        footer={null}
        width={600}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="输入股票名称或代码"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearchStocks}
          />
          <Button 
            type="primary" 
            loading={searchLoading}
            onClick={handleSearchStocks}
          >
            搜索
          </Button>
        </Space.Compact>

        {searchResults.length > 0 && (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {searchResults.map((stock, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  marginBottom: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => handleSelectStock(stock)}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{stock.name}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>{stock.code}</div>
                </div>
                <Button size="small" type="primary">
                  添加
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 添加分组模态框 */}
      <Modal
        title="新建分组"
        open={addGroupModalVisible}
        onCancel={() => setAddGroupModalVisible(false)}
        onOk={handleAddGroup}
        width={500}
      >
        <Form form={addGroupForm} layout="vertical">
          <Form.Item
            name="name"
            label="分组名称"
            rules={[{ required: true, message: '请输入分组名称' }]}
          >
            <Input placeholder="请输入分组名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="分组描述"
          >
            <TextArea placeholder="请输入分组描述" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="timeframe"
            label="时间周期"
            initialValue="daily"
          >
            <Select>
              <Option value="15min">15分钟</Option>
              <Option value="daily">日线</Option>
              <Option value="weekly">周线</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="indicators"
            label="技术指标"
          >
            <Select mode="multiple" placeholder="选择技术指标">
              <Option value="MA8">MA8</Option>
              <Option value="MA20">MA20</Option>
              <Option value="MA34">MA34</Option>
              <Option value="MA55">MA55</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="showRating"
            label="显示评级"
            valuePropName="checked"
            initialValue={true}
          >
            <input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入数据模态框 */}
      <Modal
        title="导入数据"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onOk={handleImportData}
        width={600}
      >
        <TextArea
          placeholder="请粘贴要导入的JSON数据"
          value={importDataText}
          onChange={(e) => setImportDataText(e.target.value)}
          rows={10}
        />
      </Modal>
    </>
  );
}
