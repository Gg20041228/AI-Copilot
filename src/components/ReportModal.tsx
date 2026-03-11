import { Modal, Divider, List, Typography } from "antd";
import { InterviewRadar } from "./InterviewRadar";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setReportModalOpen } from "../store/chatSlice";

export const ReportModal = () => {
  const dispatch = useAppDispatch();
  const { report, isReportModalOpen } = useAppSelector((state) => state.chat);

  return (
    <Modal
      title="面试评估报告"
      open={isReportModalOpen}
      onCancel={() => dispatch(setReportModalOpen(false))}
      footer={null}
      width={600}
    >
      {report && (
        <>
          <InterviewRadar scores={report.scores} />
          <Divider>改进建议</Divider>
          <List
            dataSource={report.suggestions}
            renderItem={(item) => (
              <List.Item>
                <Typography.Text mark>[建议]</Typography.Text> {item}
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
};
